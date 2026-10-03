import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "pipe", encoding: "utf8", ...options });
}

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const nested of listFiles(absolute)) files.push(path.join(entry.name, nested));
    } else {
      files.push(entry.name);
    }
  }
  return files;
}

export function verifyPackedConsumer({ root = process.cwd() } = {}) {
  const plan = JSON.parse(
    fs.readFileSync(path.join(root, "docs", "review", "public-api-selection.json"), "utf8"),
  );
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rpg-packed-consumer-"));
  try {
    const packDir = path.join(temp, "pack");
    const consumer = path.join(temp, "consumer");
    fs.mkdirSync(packDir, { recursive: true });
    fs.mkdirSync(consumer, { recursive: true });

    run("pnpm", ["pack", "--pack-destination", packDir], { cwd: root });
    const tarball = fs
      .readdirSync(packDir)
      .filter((name) => name.endsWith(".tgz"))
      .map((name) => path.join(packDir, name))[0];
    if (!tarball) throw new Error("pnpm pack did not create a tarball");

    fs.writeFileSync(
      path.join(consumer, "package.json"),
      JSON.stringify({ private: true, type: "module" }, null, 2),
    );
    run("pnpm", ["add", "--offline", tarball], { cwd: consumer });

    const installed = path.join(consumer, "node_modules", "@drakeshard", "rpg");
    const unexpected = listFiles(installed).filter(
      (file) =>
        file.startsWith("src/") ||
        file.startsWith("test/") ||
        file.startsWith("examples/") ||
        file.startsWith("scripts/"),
    );
    if (unexpected.length > 0) {
      throw new Error(`packed artifact leaked non-distributable files: ${unexpected.join(", ")}`);
    }

    const imports = plan.exports
      .map((entry) => `import * as ${entry.subpath.slice(2).replaceAll("-", "_")} from "@drakeshard/rpg/${entry.subpath.slice(2)}";`)
      .join("\n");
    const uses = plan.exports
      .map((entry) => `void ${entry.subpath.slice(2).replaceAll("-", "_")};`)
      .join("\n");
    fs.writeFileSync(path.join(consumer, "consumer.ts"), `${imports}\n${uses}\n`);
    fs.writeFileSync(
      path.join(consumer, "runtime.mjs"),
      `await Promise.all(${JSON.stringify(plan.exports.map((entry) => `@drakeshard/rpg/${entry.subpath.slice(2)}`))}.map((specifier) => import(specifier)));\n`,
    );
    fs.writeFileSync(
      path.join(consumer, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            noEmit: true,
          },
          include: ["consumer.ts"],
        },
        null,
        2,
      ),
    );

    run(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", path.join(consumer, "tsconfig.json")], {
      cwd: consumer,
    });
    run(process.execPath, [path.join(consumer, "runtime.mjs")], { cwd: consumer });

    let rootImportFailed = false;
    try {
      run(process.execPath, ["--input-type=module", "-e", 'import("@drakeshard/rpg")'], {
        cwd: consumer,
      });
    } catch {
      rootImportFailed = true;
    }
    if (!rootImportFailed) throw new Error("root @drakeshard/rpg import unexpectedly resolved");

    return { tarball: path.basename(tarball), subpaths: plan.exports.length };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function runCli() {
  const result = verifyPackedConsumer();
  console.log(
    `Packed consumer verification: OK (${result.subpaths} subpaths via ${result.tarball})`,
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
