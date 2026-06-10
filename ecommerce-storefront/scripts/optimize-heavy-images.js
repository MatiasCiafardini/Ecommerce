#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const MIN_BYTES = 500 * 1024;
const QUALITY = 78;
const MAX_DIMENSION = 1920;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    minBytes: Number(
      argv.find((arg) => arg.startsWith("--min-kb="))?.split("=")[1],
    ) * 1024 || MIN_BYTES,
  };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return [entryPath];
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let sharp;

  try {
    sharp = require("sharp");
  } catch {
    console.error(
      'Missing dependency "sharp". Run "npm install" in ecommerce-storefront before using this script.',
    );
    process.exit(1);
  }

  const imagesRoot = path.join(process.cwd(), "public", "images");

  if (!fs.existsSync(imagesRoot)) {
    console.error(`Images directory not found: ${imagesRoot}`);
    process.exit(1);
  }

  const candidates = walkFiles(imagesRoot)
    .filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .filter((filePath) => fs.statSync(filePath).size > options.minBytes);

  if (candidates.length === 0) {
    console.log("No heavy PNG/JPG/JPEG images found.");
    return;
  }

  let originalTotal = 0;
  let webpTotal = 0;
  const rows = [];

  for (const filePath of candidates) {
    const originalBytes = fs.statSync(filePath).size;
    const outputPath = filePath.replace(/\.(png|jpe?g)$/i, ".webp");
    const pipeline = sharp(filePath)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY });
    const outputBuffer = await pipeline.toBuffer();
    const webpBytes = outputBuffer.length;

    originalTotal += originalBytes;
    webpTotal += webpBytes;

    if (options.apply) {
      fs.writeFileSync(outputPath, outputBuffer);
    }

    rows.push({
      file: path.relative(process.cwd(), filePath),
      output: path.relative(process.cwd(), outputPath),
      original: originalBytes,
      webp: webpBytes,
      saving: originalBytes - webpBytes,
    });
  }

  console.table(
    rows.map((row) => ({
      file: row.file,
      output: row.output,
      original: formatBytes(row.original),
      webp: formatBytes(row.webp),
      saving: formatBytes(row.saving),
    })),
  );

  console.log("");
  console.log(`Images scanned: ${candidates.length}`);
  console.log(`Original total: ${formatBytes(originalTotal)}`);
  console.log(`Estimated WebP total: ${formatBytes(webpTotal)}`);
  console.log(`Estimated saving: ${formatBytes(originalTotal - webpTotal)}`);

  if (!options.apply) {
    console.log("");
    console.log("Dry run only. Re-run with --apply to write .webp files next to originals.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
