import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function findBuildArtifactViolations({ root = process.cwd() } = {}) {
  const violations = [];
  const sourceRoot = path.join(root, "src");
  const distRoot = path.join(root, "dist");

  if (!fs.existsSync(distRoot)) {
    return ["dist: build output is missing; run pnpm build before checking artifacts"];
  }

  const expected = new Set();
  for (const sourceFile of walk(sourceRoot)) {
    if (path.extname(sourceFile) !== ".ts") continue;
    const relative = toPosix(path.relative(sourceRoot, sourceFile)).replace(/\.ts$/, "");
    expected.add(`${relative}.js`);
    expected.add(`${relative}.d.ts`);
    expected.add(`${relative}.d.ts.map`);
  }

  const actual = new Set(
    walk(distRoot)
      .map((file) => toPosix(path.relative(distRoot, file)))
      .sort(),
  );

  for (const file of expected) {
    if (!actual.has(file)) violations.push(`dist: missing expected build artifact "${file}"`);
  }

  for (const file of actual) {
    if (!expected.has(file)) {
      violations.push(`dist: unexpected build artifact "${file}"`);
    }
  }

  for (const file of actual) {
    if (
      file.includes("/test/") ||
      file.startsWith("test/") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx") ||
      file.endsWith(".md") ||
      file.endsWith(".json")
    ) {
      violations.push(`dist: source/test/documentation artifact must not be distributed: "${file}"`);
    }
  }

  return violations;
}

function runCli() {
  const violations = findBuildArtifactViolations();
  if (violations.length > 0) {
    console.error("Build artifact shape violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log("Build artifact shape: OK");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
