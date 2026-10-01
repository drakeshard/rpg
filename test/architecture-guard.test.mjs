import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findArchitectureViolations } from "../scripts/check-architecture.mjs";

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

function checkSource(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rpg-architecture-"));
  temporaryRoots.push(root);
  const sourceRoot = path.join(root, "src");
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "fixture.ts"), source);
  return findArchitectureViolations({ root, sourceRoot });
}

describe("architecture guard", () => {
  it("allows deterministic relative domain code", () => {
    expect(
      checkSource(`
        import { apply } from "./domain/apply.js";
        export function run(now, draw) {
          return apply({ now, draw });
        }
      `),
    ).toEqual([]);
  });

  it("rejects unadmitted external imports", () => {
    expect(checkSource('import thing from "some-package";')).toEqual([
      'src/fixture.ts: RPG source may not import external package "some-package" before explicit architecture admission',
    ]);
  });

  it.each(["tactical", "presentation", "ui", "browser"])(
    "rejects relative imports through the %s layer",
    (segment) => {
      expect(checkSource(`import "./${segment}/adapter.js";`)[0]).toContain(
        "must not depend on Tactical/presentation/UI/browser path",
      );
    },
  );

  it.each([
    ["Math.random();", "uncontrolled randomness via Math.random()"],
    ["crypto.getRandomValues(bytes);", "uncontrolled randomness via crypto.getRandomValues()"],
    ["crypto.randomUUID();", "uncontrolled randomness via crypto.randomUUID()"],
    ["Date.now();", "hidden wall clock via Date.now()"],
    ["new Date();", "hidden wall clock via zero-argument new Date()"],
    ["performance.now();", "hidden wall clock via performance.now()"],
    ["setTimeout(step, 1);", "implicit timer via setTimeout()"],
    ["setInterval(step, 1);", "implicit timer via setInterval()"],
    ["queueMicrotask(step);", "implicit async scheduling via queueMicrotask()"],
    ["window.location;", "renderer/browser state via window"],
    ["document.body;", "DOM state via document"],
    ["navigator.userAgent;", "browser state via navigator"],
    ["localStorage.getItem('state');", "browser storage via localStorage"],
    ["sessionStorage.getItem('state');", "browser storage via sessionStorage"],
    ["requestAnimationFrame(step);", "renderer timing via requestAnimationFrame()"],
  ])("rejects hidden authoritative input: %s", (source, label) => {
    expect(checkSource(source)[0]).toContain(label);
  });
});
