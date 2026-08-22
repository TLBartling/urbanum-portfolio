import { useEffect, useRef } from "react";
import {
  getArchiveOptimizedImageSrc,
  getArchiveOptimizedImageSrcSet,
} from "./imageOptimization";

// Project Filter Composition (client-requested): when the archive is
// filtered by Project, the normal DAPC/procedural composition (App.jsx's
// buildGalleryItems/createGalleryBatch/pickImage) is replaced by this
// single horizontally-scrolling row instead -- see isProjectFilterActive
// in App.jsx for the render branch that swaps to this component, and its
// own comment for why: a Project's own ~3-5 images, fed into the normal
// composition's large-pool orientation-bucket picker, get repeated
// across the tiled archive rather than reading as their own deliberate
// sequence. This component is intentionally isolated from that engine --
// it owns no world/camera state, touches no ref that engine writes to
// every frame, and never runs while the normal composition is what's on
// screen (App.jsx keeps .gallery-track permanently mounted, just hidden,
// precisely so the camera/GSAP quickSetter machinery there is never
// handed a different DOM node to write to -- see App.jsx's own comment
// at the render branch).
//
// Aspect-ratio rhythm, reusing the Journal grid's own rule (not its row-
// packing code): JournalPage.jsx's buildJustifiedRows solves a MULTI-ROW
// grid's row HEIGHT from a fixed column count and each image's own real
// aspect ratio, so a row's landscape/portrait mix is a direct, honest
// reflection of the actual photographs rather than an invented
// alternating pattern -- see that file's own extensive comment for the
// full reasoning, unchanged and untouched here. This is the single-row,
// horizontally-overflowing version of that same rule: instead of solving
// a row's height from a fixed container width, this row's height is
// fixed (see ROW_HEIGHT_* below) and every image's WIDTH is solved from
// that same fixed height and its own real aspect ratio -- same governing
// idea (a shared fixed dimension + the image's own ratio decides the
// other dimension), just inverted, because this row scrolls rather than
// having to make N images sum to one container width. DEFAULT_ASPECT_RATIO
// is copied verbatim from JournalPage.jsx's own constant (same value, same
// "this project's own dominant real landscape ratio" reasoning) rather
// than imported, since JournalPage.jsx's own appearance and code were
// both explicitly out of scope to touch for this change -- this is the
// one small, deliberate duplication that keeps this component fully
// isolated, not a second, competing definition of "how Journal works."
const DEFAULT_ASPECT_RATIO = 3 / 2;

// Same clamp(14px, 1.6vw, 24px) gutter already used throughout this
// stylesheet (see .index-drawer__row's own comment in styles.css, and
// JournalPage.jsx's getGutter, which evaluates this same clamp in JS
// against ITS OWN container width) -- expressed here directly as CSS
// since this row has no fixed container width to solve against (it
// scrolls), so there's nothing for a JS recomputation to add over the
// plain CSS value.
const ROW_GUTTER_CSS = "clamp(14px, 1.6vw, 24px)";

// Row height is solved from the same vertical budget the normal archive
// already renders inside (openingHeight, passed down from App.jsx's own
// openingGeometry.height -- the exact value .opening-viewport's height
// is set to) rather than a hardcoded pixel figure, so this row sits
// inside the site's existing header/footer chrome exactly the way the
// normal composition already does, with no layout change of its own.
// Bounded so a very tall opening (a big desktop window) doesn't stretch
// tiles absurdly large, and a very short one (a small laptop, or mobile
// with the drawer open) doesn't shrink them to nothing.
const ROW_HEIGHT_MIN = 160;
const ROW_HEIGHT_MAX = 480;
const ROW_HEIGHT_RATIO_OF_OPENING = 0.62;

function resolveRowImageRatio(item) {
  return typeof item.aspectRatio === "number" && item.aspectRatio > 0
    ? item.aspectRatio
    : DEFAULT_ASPECT_RATIO;
}

function resolveRowHeight(openingHeight) {
  if (!openingHeight || openingHeight <= 0) return ROW_HEIGHT_MIN;
  return Math.max(
    ROW_HEIGHT_MIN,
    Math.min(openingHeight * ROW_HEIGHT_RATIO_OF_OPENING, ROW_HEIGHT_MAX),
  );
}

// Isolated wheel-to-horizontal-scroll, scoped to this row's own DOM node
// only (never window) -- deliberately NOT the normal archive's
// wheel/velocity/friction Camera system (see App.jsx's own guard on its
// window-level handleWheel/handleTouchMove, which steps aside while this
// component is mounted so the two never fight over the same gesture).
// This row is a small, finite, native-scrollable element -- it needs
// none of that system's inertia/zoom/world-coordinate machinery, only
// the same "a vertical wheel gesture moves this horizontally" convention
// the rest of the site's horizontal browsing already trained visitors to
// expect (same deltaY + deltaX combination App.jsx's addGalleryVelocity
// already uses, just applied directly to scrollLeft instead of a
// velocity ref). Attached via a raw addEventListener with
// { passive: false }, not a React onWheel prop, for the same reason
// App.jsx's own handleWheel is: React registers onWheel/onTouchMove as
// passive at the root by default, which silently prevents
// event.preventDefault() from doing anything.
function useWheelToHorizontalScroll(scrollRef) {
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const handleWheel = (event) => {
      if (event.deltaY === 0 && event.deltaX === 0) return;
      node.scrollLeft += event.deltaY + event.deltaX;
      event.preventDefault();
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [scrollRef]);
}

// `items` -- the exact Archive Items the currently active Filter/Search
// query matched (see App.jsx's projectFilterItems), already in their
// source order (queryArchive never reorders -- see
// metadataQueryEngine.js's own contract comment), which is this
// project's own CMS-authored sortOrder. Nothing here re-sorts, dedupes,
// or repeats a single image to fill space -- the row is exactly as wide
// as the selected project's own real image set requires, per the
// client's explicit "do not solve repetition by duplicating images"
// requirement.
export default function ProjectFilterRow({
  items,
  openingHeight,
  onSelectImage,
}) {
  const scrollRef = useRef(null);
  useWheelToHorizontalScroll(scrollRef);

  const rowHeight = resolveRowHeight(openingHeight);

  return (
    <div className="project-filter-row" ref={scrollRef}>
      <div
        className="project-filter-row__track"
        style={{ height: `${rowHeight}px`, gap: ROW_GUTTER_CSS }}
      >
        {items.map((item, index) => {
          const ratio = resolveRowImageRatio(item);
          const width = rowHeight * ratio;
          const isProjectLinked = Boolean(item.project);

          return (
            <button
              key={item.archiveNumber ?? item.image ?? index}
              type="button"
              className="project-filter-row__tile"
              style={{ width: `${width}px` }}
              onClick={
                isProjectLinked ? () => onSelectImage(item) : undefined
              }
              aria-label={
                isProjectLinked
                  ? `View project: ${item.title || `Project image ${index + 1}`}`
                  : item.title || `Project image ${index + 1}`
              }
            >
              <picture>
                <source
                  type="image/webp"
                  srcSet={getArchiveOptimizedImageSrcSet(item.image, "webp")}
                  sizes={`${Math.round(width)}px`}
                />
                <source
                  type="image/jpeg"
                  srcSet={getArchiveOptimizedImageSrcSet(item.image, "jpg")}
                  sizes={`${Math.round(width)}px`}
                />
                <img
                  className="project-filter-row__img"
                  src={getArchiveOptimizedImageSrc(item.image)}
                  alt={item.title || `Project image ${index + 1}`}
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                />
              </picture>
            </button>
          );
        })}
      </div>
    </div>
  );
}
