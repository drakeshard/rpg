import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireFile(root, relative, label, violations) {
  if (!fs.existsSync(path.join(root, relative))) violations.push(`${label}: missing "${relative}"`);
}

export function findPublicApiReadinessViolations({ root = process.cwd() } = {}) {
  const violations = [];
  const packageJson = readJson(path.join(root, "package.json"));
  const plan = readJson(path.join(root, "docs", "review", "public-api-selection.json"));

  if (plan.package !== "@drakeshard/rpg") {
    violations.push('public-api-selection.json: package must be "@drakeshard/rpg"');
  }
  if (plan.status !== "selected-pre-1.0" || plan.admissionGate !== "selected") {
    violations.push("public-api-selection.json: v0.1 API must remain selected");
  }
  if (plan.publishAuthorized !== false) {
    violations.push("public-api-selection.json: npm publication must remain unauthorized");
  }
  if (!Array.isArray(plan.exports) || plan.exports.length !== 7) {
    violations.push("public-api-selection.json: exactly seven RPG subpaths are selected");
    return violations;
  }

  const expectedExports = {};
  for (const entry of plan.exports) {
    expectedExports[entry.subpath] = {
      types: `./${entry.types}`,
      import: `./${entry.dist}`,
    };
    requireFile(root, entry.source, entry.subpath, violations);
    requireFile(root, entry.dist, entry.subpath, violations);
    requireFile(root, entry.types, entry.subpath, violations);
  }

  if (JSON.stringify(packageJson.exports) !== JSON.stringify(expectedExports)) {
    violations.push("package.json: export map must exactly match the selected RPG plan");
  }
  if (packageJson.exports?.["."] !== undefined) {
    violations.push("package.json: root gameplay import must remain unsupported");
  }
  if (packageJson.private !== true) {
    violations.push("package.json: package must remain private until the npm release task");
  }

  return violations;
}

function runCli() {
  const violations = findPublicApiReadinessViolations();
  if (violations.length > 0) {
    console.error("Public API readiness violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    "Public API readiness: selected v0.1 surface is mechanically ready; npm publication remains closed.",
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
