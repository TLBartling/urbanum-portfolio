import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Archive/DAPC-only counterpart to optimize-images.mjs (Production
// image-optimization pass, Josh review). Deliberately a second, sibling
// script rather than a change to optimize-images.mjs itself -- the
// existing project-image pipeline (source, output, quality, the metadata
// file it writes) is untouched, and this one just runs alongside it (see
// package.json's optimize:images).
//
// Same source directory, same three width tiers, same "read every
// supported image in public/img/, resize, encode both formats" shape as
// optimize-images.mjs -- generated from the RAW originals, not from the
// already-compressed /optimized/1200 tier, so there's no double-JPEG
// generation loss stacked on top of the production files. The only
// differences are the output directory and the quality constants below.
// Nothing here reads or writes anything project-specific: no filenames,
// no project slugs, no assumption about how many images exist -- it just
// processes whatever supported image files it finds in public/img/, the
// same way optimize-images.mjs already does.
//
// Does NOT write image-metadata.json -- that file exists for <img
// width/height> layout-shift prevention, which is a project-page/
// ImageViewer concern (see imageOptimization.js's getImageDimensions).
// DAPC tile geometry is independent of any photo's own dimensions
// (COLUMN_PATTERNS' tile w/h are fixed percentages; images are cropped
// to fit via object-fit: cover), so the archive branch has no equivalent
// need for it.
const sourceDir = path.resolve("public/img");
const outputDir = path.resolve("public/img/optimized-archive");
const widths = [400, 800, 1200];
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// See ARCHIVE_SANITY_IMAGE_QUALITY's own comment in imageOptimization.js
// for where these numbers come from -- the same visual A/B pass (100%
// crops against fine texture, high-contrast edges, smooth gradients)
// validated both.
const ARCHIVE_JPEG_QUALITY = 72;
const ARCHIVE_WEBP_QUALITY = 74;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function getSourceFiles() {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
    .filter((fileName) => fileName !== ".DS_Store");
}

async function optimizeImage(fileName) {
  const sourcePath = path.join(sourceDir, fileName);
  const { name } = path.parse(fileName);

  await Promise.all(
    widths.flatMap(async (width) => {
      const widthDir = path.join(outputDir, String(width));
      await ensureDir(widthDir);

      const webpPath = path.join(widthDir, `${name}.webp`);
      const jpgPath = path.join(widthDir, `${name}.jpg`);
      const image = sharp(sourcePath).rotate().resize({
        width,
        withoutEnlargement: true,
      });

      await Promise.all([
        image.clone().webp({ quality: ARCHIVE_WEBP_QUALITY }).toFile(webpPath),
        image.clone().jpeg({ quality: ARCHIVE_JPEG_QUALITY, mozjpeg: true }).toFile(jpgPath),
      ]);
    }),
  );
}

const files = await getSourceFiles();

await ensureDir(outputDir);
await Promise.all(files.map(optimizeImage));

console.log(
  `Archive-optimized ${files.length} images at ${widths.join(", ")}px ` +
    `(jpeg q${ARCHIVE_JPEG_QUALITY}, webp q${ARCHIVE_WEBP_QUALITY}).`,
);
