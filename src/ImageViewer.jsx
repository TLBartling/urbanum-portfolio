import { getOptimizedImageSrc, getOptimizedImageSrcSet } from "./imageOptimization.js";

// The template's large image, plus the one control that lives directly on
// it: the Project Information trigger (the +/X, passed in via `overlay`).
// Image Navigation and the Archive Number used to render here too, but
// both moved out to ProjectTemplate.jsx as of the final correction pass
// (Josh review) -- see ImageNavigation.jsx and ProjectTemplate.jsx's own
// comments for why. This component's only remaining job is: display the
// current image, at its own natural size, with nothing overlaid on it
// except the metadata trigger.
//
// Cropping correction (Josh review, final correction pass): the previous
// pass anchored the metadata trigger using a wrapper
// (.project-image-frame__inner) sized via an inline CSS `aspect-ratio`
// computed from this image's PRECOMPUTED intrinsic dimensions
// (image-metadata.json, generated at build time by
// scripts/optimize-images.mjs). That's a real risk of mismatch -- most
// concretely, that script reads metadata via a plain `sharp(...).metadata()`
// call BEFORE its own `.rotate()` step, so a source photo with an EXIF
// orientation flag could have its recorded width/height transposed
// relative to what actually renders -- and forcing the wrapper (and via
// it, effectively the image) into a WRONG aspect-ratio box means the
// photo gets stretched/distorted to fill it, which is exactly the kind of
// cropping/distortion this page must never do. Fixed by removing the
// precomputed aspect-ratio dependency entirely: the image now sizes
// itself purely from its own loaded content plus a non-percentage CSS
// constraint (see .project-image-frame__img in styles.css -- the same
// viewport-derived formula .project-image-frame's own height already
// uses, not a percentage of anything), and .project-image-frame__inner
// simply shrink-wraps to whatever box the image ends up rendering at, via
// ordinary flex-item content-sizing -- no wrapper-imposed ratio, no
// width/height attributes standing in for the image's real content. The
// relationship is now strictly IMAGE determines its own rendered
// dimensions -> WRAPPER conforms to IMAGE -> the metadata trigger anchors
// to WRAPPER, never the reverse. See .project-image-frame__inner's own
// comment in styles.css for the non-circular sizing reasoning.
//
// Image-first redesign: the taupe .project-image-frame background is
// gone -- the frame is now purely a centering/sizing box, not a visible
// "container." `overlay` is the one remaining slot, an accepted-as-is
// ReactNode this component doesn't inspect or know the meaning of --
// rendered inside .project-image-frame__inner (see above), so whatever's
// passed in -- the Project Information trigger -- can be positioned via
// plain CSS `position: absolute` against the actual photo's own corner,
// correctly for every aspect ratio, with no cropping.
//
// Image loading (Josh review, final polish pass): this <img> requests a
// properly-sized width variant through the same getOptimizedImageSrc/
// getOptimizedImageSrcSet pipeline the homepage gallery already uses (see
// imageOptimization.js) instead of the full original file.
// loading="eager"/fetchPriority="high" mirror what the homepage's own
// single-large-image case (its "focused image" lightbox) already does
// for the one prominent image a user is looking at -- see App.jsx.
// Delivery (which sized asset to request) and presentation (how it's
// laid out once it arrives) are kept strictly separate here: nothing
// about this request-sizing logic constrains the image's own aspect
// ratio or crops it -- both optimized delivery paths (the local
// pre-generated variants and the live Sanity CDN transform) only ever
// constrain width, letting height follow proportionally; see
// imageOptimization.js's own comment.
//
// onImageLoaded (Josh review, final correction pass): fired from the
// <img>'s own onLoad event once the CURRENTLY REQUESTED image has
// actually finished loading -- this is what lets ProjectTemplate.jsx
// know when it's safe to advance the counter/archive-number display
// (see ImageNavigation.jsx and ProjectTemplate's handleImageLoaded), so
// the visible "N / M" text and archive number never run ahead of the
// photograph that's actually on screen.
export default function ImageViewer({ image, overlay, onImageLoaded }) {
  return (
    <div className="project-image-viewer">
      <div className="project-image-frame">
        <div className="project-image-frame__inner">
          <picture>
            <source
              type="image/webp"
              srcSet={getOptimizedImageSrcSet(image.image, "webp")}
              sizes="90vw"
            />
            <source
              type="image/jpeg"
              srcSet={getOptimizedImageSrcSet(image.image, "jpg")}
              sizes="90vw"
            />
            <img
              className="project-image-frame__img"
              src={getOptimizedImageSrc(image.image, 1200)}
              alt={image.title || image.caption || `Archive ${image.archiveNumber}`}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onLoad={() => onImageLoaded?.(image.archiveNumber)}
            />
          </picture>
          {overlay}
        </div>
      </div>
    </div>
  );
}
