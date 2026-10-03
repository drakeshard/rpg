import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runtimeDependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"];
const expectedExports = {
  "./advancement": {
    types: "./dist/advancement/index.d.ts",
    import: "./dist/advancement/index.js",
  },
  "./attributes": {
    types: "./dist/attributes/index.d.ts",
    import: "./dist/attributes/index.js",
  },
  "./capabilities": {
    types: "./dist/capabilities/index.d.ts",
    import: "./dist/capabilities/index.js",
  },
  "./loadout": {
    types: "./dist/loadout/index.d.ts",
    import: "./dist/loadout/index.js",
  },
  "./resources": {
    types: "./dist/resources/index.d.ts",
    import: "./dist/resources/index.js",
  },
  "./roles": {
    types: "./dist/roles/index.d.ts",
    import: "./dist/roles/index.js",
  },
  "./specialization": {
    types: "./dist/specialization/index.d.ts",
    import: "./dist/specialization/index.js",
  },
};

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

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function findPackageInvariantViolations({ root = process.cwd() } = {}) {
  const violations = [];
  const packageJson = readJson(path.join(root, "package.json"));
  const rootIndexPath = path.join(root, "src", "index.ts");

  if (packageJson.name !== "@drakeshard/rpg") {
    violations.push('package.json: name must remain "@drakeshard/rpg"');
  }
  if (packageJson.private !== true) {
    violations.push("package.json: package must remain private until the npm release task");
  }
  if (packageJson.type !== "module") {
    violations.push('package.json: "type" must remain "module"');
  }
  if (packageJson.license !== "Apache-2.0") {
    violations.push('package.json: "license" must be "Apache-2.0"');
  }
  if (
    !Array.isArray(packageJson.files) ||
    packageJson.files.length !== 1 ||
    packageJson.files[0] !== "dist"
  ) {
    violations.push('package.json: "files" must remain exactly ["dist"]');
  }
  if (!sameJson(packageJson.exports, expectedExports)) {
    violations.push("package.json: exports must exactly match the selected v0.1 RPG subpaths");
  }
  for (const field of ["main", "module", "types", "typings"]) {
    if (packageJson[field] !== undefined) {
      violations.push(`package.json: root entry field "${field}" must remain absent for v0.1`);
    }
  }
  if (packageJson.engines !== undefined) {
    violations.push("package.json: consumer engines must not mirror the repository toolchain");
  }
  if (packageJson.sideEffects !== false) {
    violations.push('package.json: "sideEffects" must be false');
  }
  if (packageJson.publishConfig?.access !== "public") {
    violations.push('package.json: publishConfig.access must be "public"');
  }

  for (const field of runtimeDependencyFields) {
    if (hasEntries(packageJson[field])) {
      violations.push(
        `package.json: runtime dependency field "${field}" must remain empty (found: ${Object.keys(packageJson[field]).sort().join(", ")})`,
      );
    }
  }

  if (!fs.existsSync(rootIndexPath)) {
    violations.push("src/index.ts: stable root entry point is missing");
  } else if (normalizeEmptyRootSource(fs.readFileSync(rootIndexPath, "utf8")) !== "export{};") {
    violations.push("src/index.ts: root gameplay export must remain empty for v0.1");
  }

  return violations;
}

function runCli() {
  const violations = findPackageInvariantViolations();
  if (violations.length > 0) {
    console.error("Package/public-surface invariant violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }
  console.log("Package/public-surface invariants: OK");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
