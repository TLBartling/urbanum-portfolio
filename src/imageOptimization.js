import imageMetadata from "./image-metadata.json";
import { urlFor } from "./cms/imageUrl.js";

// Shared image-delivery helpers -- extracted from App.jsx's homepage
// gallery pipeline (Project Page image-loading polish, Josh review) so
// ImageViewer.jsx (the Project Page's own large image) can request the
// exact same appropriately-sized, pre-optimized/Sanity-transformed image
// variants the homepage gallery already requests, from one shared source
// instead of a second, possibly-drifting copy. Every function below is
// unchanged logic, only its location moved -- App.jsx now imports these
// instead of defining them, and its own remaining homepage-only helpers
// (getGalleryImageSizes, shouldEagerLoadImage) stay where they are, since
// neither is meaningful outside the homepage's own tile-layout/eager-
// loading-budget concepts.
//
// The bug this extraction fixes: ImageViewer.jsx previously rendered
// `<img src={image.image} />` with zero transformation -- for a local
// stock photo (the current dataset), that's the full original file
// (public/img/*.jpg, ~1-3.7MB each, 91MB total across 36 files) requested
// unconditionally regardless of how small the photo actually renders on
// screen; for a live Sanity-sourced image, it would be the full,
// untransformed original asset from cdn.sanity.io. Neither is what a
// visitor's browser needs to paint a photo that's at most
// `max(340px, calc(100vh - 300px))` tall. Both problems already had a
// working fix sitting one file away.
export const optimizedImageWidths = [400, 800, 1200];

// Compression quality passed to Sanity's own image pipeline. 75 is
// Sanity's own long-standing default for this parameter; made explicit
// here (rather than left implicit) so the tradeoff is a visible, tunable
// constant instead of an assumption baked into a function body.
const SANITY_IMAGE_QUALITY = 75;

export function getImageName(src) {
  return src.split("/").pop()?.replace(/\.[^.]+$/, "") || "";
}

// Handshake pass (default homepage pool): the optimized-image pipeline
// (scripts/optimize-images.mjs, run at build time) only ever generated
// width-variant/webp files for the known local stock photos under /img/
// -- a live Archive Item's `image` is a full cdn.sanity.io URL with no
// corresponding pre-optimized file. This guard is not a redesign of that
// pipeline -- it's the minimum needed so a live URL still renders instead
// of producing a broken /img/optimized/... path.
export function isLocalImageAsset(src) {
  return typeof src === "string" && src.startsWith("/img/");
}

// Responsive Sanity Image Delivery: the live counterpart to
// isLocalImageAsset immediately above -- every real Archive Item image is
// a cdn.sanity.io URL (see cms/queries.js's normalizeArchiveItem, which
// this leaves completely untouched: item.image/item.src stays exactly the
// same canonical, unsized URL it always was -- only how a *variant* of
// that URL gets requested at render time changes here).
export function isSanityImageAsset(src) {
  return typeof src === "string" && /^https?:\/\/cdn\.sanity\.io\//.test(src);
}

// The live equivalent of "the optimized-image pipeline generated this
// width-variant file at build time" -- except nothing needs generating
// ahead of time, since Sanity's CDN performs the resize on request. Built
// through the exact same urlFor(...) builder cms/imageUrl.js exports for
// this purpose. .auto("format") lets Sanity's CDN perform its own
// Accept-header content negotiation (serving WebP/AVIF/original,
// whichever the requesting browser actually supports), the live
// equivalent of the two hardcoded <source type="image/webp">/<source
// type="image/jpeg"> branches the local-asset path relies on instead.
function buildSanityImageUrl(src, width) {
  return urlFor(src)
    .width(width)
    .quality(SANITY_IMAGE_QUALITY)
    .auto("format")
    .url();
}

export function getOptimizedImageSrc(src, width = 800, extension = "jpg") {
  if (isSanityImageAsset(src)) return buildSanityImageUrl(src, width);
  if (!isLocalImageAsset(src)) return src;
  return `/img/optimized/${width}/${getImageName(src)}.${extension}`;
}

export function getOptimizedImageSrcSet(src, extension) {
  // Same guard shape as getOptimizedImageSrc above, extended to cover
  // both known-optimizable source kinds: for a live Sanity URL there IS a
  // real width-variant srcSet to build (via getOptimizedImageSrc's own
  // Sanity branch, called once per breakpoint exactly like the
  // local-asset case already does); for anything else (a src this
  // pipeline doesn't recognize) this omits the attribute (undefined --
  // React drops it from the rendered <source>) rather than emit a set of
  // identical entries at different width descriptors.
  if (!isLocalImageAsset(src) && !isSanityImageAsset(src)) return undefined;
  return optimizedImageWidths
    .map((width) => `${getOptimizedImageSrc(src, width, extension)} ${width}w`)
    .join(", ");
}

// Real intrinsic pixel dimensions for a known local asset (generated at
// build time into image-metadata.json by scripts/optimize-images.mjs), or
// a generic 1200x800 fallback for anything not in that map (a live Sanity
// asset today, since Sanity's own dimension metadata isn't threaded
// through yet -- see cms/queries.js). Used both for <img width/height>
// (so the browser can reserve the right box before the image loads, with
// no layout shift) and to derive a wrapper's aspect-ratio without any
// JS measurement of the rendered element.
export function getImageDimensions(src) {
  return imageMetadata[src] || { width: 1200, height: 800 };
}
