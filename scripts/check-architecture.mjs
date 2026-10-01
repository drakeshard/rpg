import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);
const forbiddenRelativeSegments = new Set(["browser", "presentation", "tactical", "ui"]);
const forbiddenRuntimePatterns = [
  ["uncontrolled randomness via Math.random()", /\bMath\.random\s*\(/g],
  ["uncontrolled randomness via crypto.getRandomValues()", /\bcrypto\.getRandomValues\s*\(/g],
  ["uncontrolled randomness via crypto.randomUUID()", /\bcrypto\.randomUUID\s*\(/g],
  ["hidden wall clock via Date.now()", /\bDate\.now\s*\(/g],
  ["hidden wall clock via zero-argument new Date()", /\bnew\s+Date\s*\(\s*\)/g],
  ["hidden wall clock via performance.now()", /\bperformance\.now\s*\(/g],
  ["implicit timer via setTimeout()", /\bsetTimeout\s*\(/g],
  ["implicit timer via setInterval()", /\bsetInterval\s*\(/g],
  ["implicit async scheduling via queueMicrotask()", /\bqueueMicrotask\s*\(/g],
  ["renderer/browser state via window", /\bwindow\s*[.[]/g],
  ["DOM state via document", /\bdocument\s*[.[]/g],
  ["browser state via navigator", /\bnavigator\s*[.[]/g],
  ["browser storage via localStorage", /\blocalStorage\b/g],
  ["browser storage via sessionStorage", /\bsessionStorage\b/g],
  ["renderer timing via requestAnimationFrame()", /\brequestAnimationFrame\s*\(/g],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function collectSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /^\s*import\s+(?:type\s+)?(?:[^"'\n]+?\s+from\s+)?["']([^"']+)["']/gm,
    /^\s*export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/gm,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function includesForbiddenRelativeSegment(resolvedPath) {
  return resolvedPath.split("/").some((segment) => {
    const withoutExtension = segment.replace(/\.[^.]+$/, "");
    return forbiddenRelativeSegments.has(withoutExtension);
  });
}

export function findArchitectureViolations({
  root = process.cwd(),
  sourceRoot = path.join(root, "src"),
} = {}) {
  const violations = [];

  for (const file of walk(sourceRoot)) {
    const source = fs.readFileSync(file, "utf8");
    const relativeFile = path.relative(root, file);

    for (const specifier of collectSpecifiers(source)) {
      if (!specifier.startsWith(".")) {
        violations.push(
          `${relativeFile}: RPG source may not import external package "${specifier}" before explicit architecture admission`,
        );
        continue;
      }

      const resolved = path.resolve(path.dirname(file), specifier).split(path.sep).join("/");
      if (includesForbiddenRelativeSegment(resolved)) {
        violations.push(
          `${relativeFile}: RPG source must not depend on Tactical/presentation/UI/browser path "${specifier}"`,
        );
      }
    }

    for (const [label, pattern] of forbiddenRuntimePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) {
        violations.push(`${relativeFile}: RPG authoritative source prohibits ${label}`);
      }
    }
  }

  return violations;
}

function runCli() {
  const violations = findArchitectureViolations();
  if (violations.length > 0) {
    console.error("Architecture boundary violations:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log("Architecture boundaries: OK");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
