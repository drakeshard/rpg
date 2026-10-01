import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findPackageInvariantViolations } from "../scripts/check-package.mjs";

const roots = [];

function repositoryFixture(packageJson = {}, rootSource = "export {};\n") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rpg-package-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "@drakeshard/rpg",
      license: "Apache-2.0",
      private: true,
      files: ["dist"],
      ...packageJson,
    }),
  );
  fs.writeFileSync(path.join(root, "src", "index.ts"), rootSource);
  return root;
}

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

describe("package/incubation invariant guard", () => {
  it("accepts the private dist-only package with an empty stable root", () => {
    expect(findPackageInvariantViolations({ root: repositoryFixture() })).toEqual([]);
  });

  it("rejects a different shared-library license", () => {
    expect(
      findPackageInvariantViolations({ root: repositoryFixture({ license: "MIT" }) }),
    ).toContain('package.json: "license" must be "Apache-2.0" under the shared-library default license policy');
  });

  it("rejects public-package admission metadata and stable gameplay exports", () => {
    const root = repositoryFixture(
      {
        private: false,
        files: ["dist", "src"],
        exports: { ".": "./dist/index.js", "./roles": "./dist/roles/index.js" },
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
      'export * from "./roles/index.js";\n',
    );

    expect(findPackageInvariantViolations({ root })).toEqual(
      expect.arrayContaining([
        'package.json: "@drakeshard/rpg" must remain private during incubation',
        'package.json: "files" must remain exactly ["dist"] during incubation',
        'package.json: "exports" must remain absent until a controlled public-surface admission decision',
        'package.json: "main" must remain absent until a controlled public-surface admission decision',
        'package.json: "types" must remain absent until a controlled public-surface admission decision',
        "src/index.ts: stable root gameplay export must remain empty until controlled admission",
      ]),
    );
  });

  it("rejects every runtime dependency field", () => {
    const root = repositoryFixture({
      dependencies: { "some-runtime": "1.0.0" },
      optionalDependencies: { "optional-runtime": "1.0.0" },
      peerDependencies: { "@drakeshard/foundation": "0.1.1" },
    });

    expect(findPackageInvariantViolations({ root })).toEqual(
      expect.arrayContaining([
        expect.stringContaining('runtime dependency field "dependencies" must remain empty'),
        expect.stringContaining(
          'runtime dependency field "optionalDependencies" must remain empty',
        ),
        expect.stringContaining('runtime dependency field "peerDependencies" must remain empty'),
      ]),
    );
  });
});
