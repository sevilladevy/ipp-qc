import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const GLOBAL_STYLE_FILE = path.join(SRC_DIR, "styles.css");
const TARGET_SELECTOR = /\.(btn-primary|btn-secondary)\b/;

// Page-level overrides are allowed only for layout behavior.
const ALLOWED_PAGE_LEVEL_PROPERTIES = new Set(["flex", "width", "justify-content"]);

async function listCssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listCssFiles(fullPath);
      }
      return entry.isFile() && entry.name.endsWith(".css") ? [fullPath] : [];
    }),
  );

  return files.flat();
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/u).length;
}

function findButtonSelectorViolations(content, filePath) {
  const violations = [];
  const blockRegex = /([^{}]+)\{([^{}]*)\}/gmu;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const selector = match[1].trim();
    if (!TARGET_SELECTOR.test(selector)) {
      continue;
    }

    const declarations = match[2]
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const declaration of declarations) {
      const colonIndex = declaration.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const property = declaration.slice(0, colonIndex).trim().toLowerCase();
      if (!property || property.startsWith("--")) {
        continue;
      }

      if (!ALLOWED_PAGE_LEVEL_PROPERTIES.has(property)) {
        violations.push({
          filePath,
          line: getLineNumber(content, match.index),
          selector,
          property,
        });
      }
    }
  }

  return violations;
}

async function main() {
  const globalStyle = await readFile(GLOBAL_STYLE_FILE, "utf8");
  if (!/\.btn-primary\b/u.test(globalStyle) || !/\.btn-secondary\b/u.test(globalStyle)) {
    throw new Error("Global button styles must exist in src/styles.css");
  }

  const cssFiles = await listCssFiles(SRC_DIR);
  const pageStyleFiles = cssFiles.filter((filePath) => filePath !== GLOBAL_STYLE_FILE);

  const violations = [];
  for (const filePath of pageStyleFiles) {
    const content = await readFile(filePath, "utf8");
    violations.push(...findButtonSelectorViolations(content, filePath));
  }

  if (violations.length > 0) {
    console.error("[lint:ui:buttons] Found disallowed .btn-primary/.btn-secondary override(s):");
    for (const violation of violations) {
      const shortPath = path.relative(ROOT, violation.filePath);
      console.error(
        `- ${shortPath}:${violation.line} property "${violation.property}" in selector "${violation.selector}"`,
      );
    }
    console.error(
      "\nAllowed page-level properties: flex, width, justify-content. Move visual styles to src/styles.css via CSS variables.",
    );
    process.exit(1);
  }

  console.log("[lint:ui:buttons] OK - no button style drift detected.");
}

main().catch((error) => {
  console.error("[lint:ui:buttons] Failed:", error.message);
  process.exit(1);
});
