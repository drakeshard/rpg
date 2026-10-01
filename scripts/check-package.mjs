import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runtimeDependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function hasEntries(value) {
  return value && typeof value === "object" && Object.keys(value).length > 0;
}

function normalizeEmptyRootSource(source) {
  return source
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function findPackageInvariantViolations({ root = process.cwd() } = {}) {
  const violations = [];
  const packagePath = path.join(root, "package.json");
  const rootIndexPath = path.join(root, "src", "index.ts");
  const packageJson = readJson(packagePath);

  if (packageJson.license !== "Apache-2.0") {
    violations.push('package.json: "license" must be "Apache-2.0" under the shared-library default license policy');
  }

  if (packageJson.private !== true) {
    violations.push('package.json: "@drakeshard/rpg" must remain private during incubation');
  }

  if (
    !Array.isArray(packageJson.files) ||
    packageJson.files.length !== 1 ||
    packageJson.files[0] !== "dist"
  ) {
    violations.push('package.json: "files" must remain exactly ["dist"] during incubation');
  }

  for (const field of runtimeDependencyFields) {
    if (hasEntries(packageJson[field])) {
      const names = Object.keys(packageJson[field]).sort().join(", ");
      violations.push(
        `package.json: runtime dependency field "${field}" must remain empty during incubation (found: ${names})`,
      );
    }
  }

  if (packageJson.exports !== undefined) {
    violations.push(
      'package.json: "exports" must remain absent until a controlled public-surface admission decision',
    );
  }

  for (const field of ["main", "module", "types", "typings"]) {
    if (packageJson[field] !== undefined) {
      violations.push(
        `package.json: "${field}" must remain absent until a controlled public-surface admission decision`,
      );
    }
  }

  if (!fs.existsSync(rootIndexPath)) {
    violations.push("src/index.ts: stable root entry point is missing");
  } else {
    const normalized = normalizeEmptyRootSource(fs.readFileSync(rootIndexPath, "utf8"));
    if (normalized !== "export{};") {
      violations.push(
        "src/index.ts: stable root gameplay export must remain empty until controlled admission",
      );
    }
  }

  return violations;
}

function runCli() {
  const violations = findPackageInvariantViolations();
  if (violations.length > 0) {
    console.error("Package/incubation invariant violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log("Package/incubation invariants: OK");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
