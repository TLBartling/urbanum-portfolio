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

// Column-grammar refinement (client mockup rhythm, "subtle one-row
// masonry"): the horizontal band is no longer strictly one image per
// column. Two CONSECUTIVE images may instead share a single column,
// stacked vertically, when doing so reads naturally rather than forced.
//
// Only landscape-or-wider images are ever stack-eligible. This is a
// direct expression of the client's own stated tendency -- "portraits
// work naturally as larger single columns," "landscapes can work well as
// stacked pairs" -- and a real proportion consequence, not just a
// preference: halving a PORTRAIT's height into two stacked slots would
// make each slot narrower still (width = slotHeight * ratio, and a
// portrait's ratio is already < 1), producing two thin, squat tiles
// rather than the "quiet, substantial" scale this row exists to
// preserve. A landscape image loses comparatively little by the same
// treatment, since its width is already generous relative to its height.
const STACK_ELIGIBLE_MIN_RATIO = 1;

// How different two adjacent landscape ratios are allowed to be before
// they're refused as a pair (max/min of the two ratios). This exists
// solely to stop the greedy walk below from pairing, say, a near-square
// 1.05 with a 3.4 ultra-wide panorama just because both clear the >= 1
// bar and happen to be neighbors -- the client's own "do not force a
// rule that creates obviously awkward crops or proportions" guidance.
// 2.2 comfortably covers every real adjacent-landscape pairing seen
// across this project's actual mock catalog (spreads of roughly
// 1.0-1.2), while still refusing a genuinely mismatched pair.
const STACK_SPREAD_MAX = 2.2;

// Pure estimate used ONLY for the JS-side width math below -- the actual
// vertical gap between two stacked images is rendered by CSS flexbox
// `gap` (see .project-filter-row__stack in styles.css), which resolves
// the real, responsive ROW_GUTTER_CSS value precisely at paint time.
// This constant never has to match that exactly: it only has to be
// close enough that each stacked image's *width* is computed against a
// roughly-right slot height. `object-fit: cover` -- already relied on
// elsewhere in this row to absorb the same kind of sub-pixel rounding --
// absorbs the small resulting mismatch.
const STACK_GUTTER_ESTIMATE_PX = 18;

function isStackEligible(item) {
  return resolveRowImageRatio(item) >= STACK_ELIGIBLE_MIN_RATIO;
}

function ratioSpread(itemA, itemB) {
  const ratioA = resolveRowImageRatio(itemA);
  const ratioB = resolveRowImageRatio(itemB);
  return Math.max(ratioA, ratioB) / Math.min(ratioA, ratioB);
}

// Single greedy left-to-right walk over `items`, deciding one column at
// a time and never revisiting a decision once made. That's what
// guarantees the client's IMPORTANT DATA RULE for free, independent of
// how the pairing happens to fall for any given project: every item is
// visited exactly once and consumed by exactly one column, so nothing
// is ever duplicated to fill space and nothing is ever dropped. Items
// are never reordered -- `items` arrives in queryArchive's own
// (CMS-authored sortOrder) order, and that order is preserved column by
// column, image by image, end to end.
//
// A pair is only formed when BOTH neighbors are stack-eligible AND their
// ratio spread is within tolerance; every other position -- a portrait,
// a lone trailing landscape, two landscapes too different to pair
// cleanly -- falls through to its own single-image column. That fall-
// through is the entire mechanism for "if the image count does not
// divide neatly, use an appropriate single-image column for the
// remainder": there is no separate remainder-handling branch, an odd or
// otherwise unpaired image simply never satisfies the pairing condition.
function planColumns(items) {
  const columns = [];
  let index = 0;

  while (index < items.length) {
    const current = items[index];
    const next = items[index + 1];

    if (
      next &&
      isStackEligible(current) &&
      isStackEligible(next) &&
      ratioSpread(current, next) <= STACK_SPREAD_MAX
    ) {
      columns.push({ type: "stack", items: [current, next] });
      index += 2;
    } else {
      columns.push({ type: "single", items: [current] });
      index += 1;
    }
  }

  return columns;
}

// A stacked column's two images share one width. Each image's own
// "natural" width is estimated from its real aspect ratio against a
// rough per-slot height (see STACK_GUTTER_ESTIMATE_PX above); the
// column's actual width is the average of the two, splitting the
// resulting crop evenly between both images rather than favoring
// either one. Since pairing already requires a bounded ratio spread,
// this average is never far from either image's own natural width.
function resolveStackWidth(rowHeight, stackItems) {
  const slotHeight = Math.max(
    (rowHeight - STACK_GUTTER_ESTIMATE_PX) / 2,
    1,
  );
  const naturalWidths = stackItems.map(
    (item) => slotHeight * resolveRowImageRatio(item),
  );
  return (
    naturalWidths.reduce((sum, width) => sum + width, 0) /
    naturalWidths.length
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
// Renders one image's <button><picture>...</picture></button>, shared
// verbatim between a true single-image column and each half of a
// stacked column -- `extraClassName` is the only difference between the
// two call sites (see the map below), so a single-image tile's markup
// and behavior are byte-for-byte what they were before this refinement.
function renderTile({
  item,
  imageIndex,
  width,
  extraClassName,
  onSelectImage,
}) {
  const isProjectLinked = Boolean(item.project);
  const className = extraClassName
    ? `project-filter-row__tile ${extraClassName}`
    : "project-filter-row__tile";

  return (
    <button
      key={item.archiveNumber ?? item.image ?? imageIndex}
      type="button"
      className={className}
      style={{ width: `${width}px` }}
      onClick={isProjectLinked ? () => onSelectImage(item) : undefined}
      aria-label={
        isProjectLinked
          ? `View project: ${item.title || `Project image ${imageIndex + 1}`}`
          : item.title || `Project image ${imageIndex + 1}`
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
          alt={item.title || `Project image ${imageIndex + 1}`}
          loading={imageIndex < 2 ? "eager" : "lazy"}
          decoding="async"
        />
      </picture>
    </button>
  );
}

export default function ProjectFilterRow({
  items,
  openingHeight,
  onSelectImage,
}) {
  const scrollRef = useRef(null);
  useWheelToHorizontalScroll(scrollRef);

  const rowHeight = resolveRowHeight(openingHeight);
  const columns = planColumns(items);

  // Tracks each image's position in the ORIGINAL flat sequence (not its
  // column position), so eager-loading the first two images and
  // building each aria-label's "Project image N" stay identical to what
  // they were before columns existed -- a stacked pair simply consumes
  // two consecutive positions instead of one.
  let imageIndex = 0;

  return (
    <div className="project-filter-row" ref={scrollRef}>
      <div
        className="project-filter-row__track"
        style={{ height: `${rowHeight}px`, gap: ROW_GUTTER_CSS }}
      >
        {columns.map((column, columnIndex) => {
          if (column.type === "single") {
            const item = column.items[0];
            const width = rowHeight * resolveRowImageRatio(item);
            const tile = renderTile({
              item,
              imageIndex,
              width,
              extraClassName: null,
              onSelectImage,
            });
            imageIndex += 1;
            return tile;
          }

          const stackWidth = resolveStackWidth(rowHeight, column.items);
          const firstItem = column.items[0];

          return (
            <div
              key={`stack-${firstItem.archiveNumber ?? firstItem.image ?? columnIndex}`}
              className="project-filter-row__stack"
              style={{ width: `${stackWidth}px`, gap: ROW_GUTTER_CSS }}
            >
              {column.items.map((item) => {
                const tile = renderTile({
                  item,
                  imageIndex,
                  width: stackWidth,
                  extraClassName: "project-filter-row__tile--stacked",
                  onSelectImage,
                });
                imageIndex += 1;
                return tile;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
