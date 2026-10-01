import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findBuildShapeViolations } from "../scripts/check-build.mjs";

const roots = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rpg-build-shape-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "src", "roles"), { recursive: true });
  fs.mkdirSync(path.join(root, "dist", "roles"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export {};\n");
  fs.writeFileSync(path.join(root, "src", "roles", "index.ts"), "export {};\n");
  for (const stem of ["index", "roles/index"]) {
    fs.writeFileSync(path.join(root, "dist", `${stem}.js`), "export {};\n");
    fs.writeFileSync(path.join(root, "dist", `${stem}.d.ts`), "export {};\n");
    fs.writeFileSync(path.join(root, "dist", `${stem}.d.ts.map`), "{}\n");
  }
  return root;
}

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

describe("build artifact shape guard", () => {
  it("accepts exactly the JavaScript, declarations, and declaration maps implied by src", () => {
    expect(findBuildShapeViolations({ root: fixture() })).toEqual([]);
  });

  it("rejects missing and unexpected distributable artifacts", () => {
    const root = fixture();
    fs.rmSync(path.join(root, "dist", "roles", "index.d.ts"));
    fs.writeFileSync(path.join(root, "dist", "roles", "roles.test.js"), "export {};\n");

    expect(findBuildShapeViolations({ root })).toEqual([
      'dist/: missing expected build artifact "roles/index.d.ts"',
      'dist/: unexpected distributable artifact "roles/roles.test.js"',
    ]);
  });

  it("requires a completed build", () => {
    const root = fixture();
    fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });
    expect(findBuildShapeViolations({ root })).toEqual([
      "dist/: build output is missing; run the build before checking artifact shape",
    ]);
  });
});
