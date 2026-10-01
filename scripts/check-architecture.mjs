import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);
const violations = [];

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

for (const file of walk(sourceRoot)) {
  const source = fs.readFileSync(file, "utf8");
  for (const specifier of collectSpecifiers(source)) {
    if (!specifier.startsWith(".")) {
      violations.push(
        path.relative(root, file) +
          ': RPG source may not import external package "' +
          specifier +
          '" before explicit architecture admission',
      );
      continue;
    }

    const resolved = path.resolve(path.dirname(file), specifier).split(path.sep).join("/");
    if (
      resolved.includes("/presentation/") ||
      resolved.includes("/ui/") ||
      resolved.includes("/browser/")
    ) {
      violations.push(
        path.relative(root, file) +
          ': RPG source must not depend on presentation/UI/browser path "' +
          specifier +
          '"',
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Architecture boundaries: OK");
