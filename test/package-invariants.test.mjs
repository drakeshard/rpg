import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findPackageInvariantViolations } from "../scripts/check-package.mjs";

const roots = [];
const exportsMap = {
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

function repositoryFixture(packageJson = {}, rootSource = "export {};\n") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rpg-package-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "@drakeshard/rpg",
      version: "0.1.0",
      private: true,
      type: "module",
      license: "Apache-2.0",
      files: ["dist"],
      sideEffects: false,
      exports: exportsMap,
      publishConfig: { access: "public" },
      ...packageJson,
    }),
  );
  fs.writeFileSync(path.join(root, "src", "index.ts"), rootSource);
  return root;
}

afterEach(() => {
  while (roots.length > 0) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

describe("RPG selected package invariant guard", () => {
  it("accepts the selected v0.1 surface while publication remains private", () => {
    expect(findPackageInvariantViolations({ root: repositoryFixture() })).toEqual([]);
  });

  it("rejects export drift and root entry points", () => {
    const root = repositoryFixture({
      exports: { ...exportsMap, ".": { import: "./dist/index.js" } },
      main: "./dist/index.js",
    });
    expect(findPackageInvariantViolations({ root }).join("\n")).toContain("selected v0.1");
    expect(findPackageInvariantViolations({ root }).join("\n")).toContain("root entry");
  });

  it("rejects runtime dependencies and repository-toolchain engines", () => {
    const root = repositoryFixture({
      dependencies: { dependency: "1.0.0" },
      engines: { node: "24.21.0" },
    });
    const result = findPackageInvariantViolations({ root }).join("\n");
    expect(result).toContain("runtime dependency");
    expect(result).toContain("consumer engines");
  });
});
