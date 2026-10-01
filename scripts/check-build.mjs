import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const nested of listFiles(absolute)) {
        files.push(path.join(entry.name, nested));
      }
    } else if (entry.isFile()) {
      files.push(entry.name);
    }
  }
  return files;
}

function expectedDistFiles(srcRoot) {
  const expected = [];
  for (const source of listFiles(srcRoot)) {
    if (!source.endsWith(".ts")) continue;
    const stem = source.slice(0, -3);
    expected.push(`${stem}.js`, `${stem}.d.ts`, `${stem}.d.ts.map`);
  }
  return expected.sort();
}

export function findBuildShapeViolations({ root = process.cwd() } = {}) {
  const srcRoot = path.join(root, "src");
  const distRoot = path.join(root, "dist");
  const violations = [];

  if (!fs.existsSync(distRoot)) {
    return ["dist/: build output is missing; run the build before checking artifact shape"];
  }

  const expected = expectedDistFiles(srcRoot);
  const actual = listFiles(distRoot).sort();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  for (const file of expected) {
    if (!actualSet.has(file)) {
      violations.push(`dist/: missing expected build artifact "${file}"`);
    }
  }

  for (const file of actual) {
    if (!expectedSet.has(file)) {
      violations.push(`dist/: unexpected distributable artifact "${file}"`);
    }
  }

  return violations;
}

function runCli() {
  const violations = findBuildShapeViolations();
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
