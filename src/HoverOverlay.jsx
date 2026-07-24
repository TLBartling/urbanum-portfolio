import { useMemo, useRef } from "react";
import { findRelatedArchiveItems } from "./relationshipEngine";
import { ARCHIVE_ITEMS } from "./mockArchiveItems";

// HoverOverlay -- presentation, plus stable per-generation randomization of
// theme/tag order.
//
// A reusable, purely presentational component: given an image's metadata,
// it renders a translucent metadata layer sized to fill its parent exactly.
// It owns no interaction logic of its own -- visibility is driven entirely
// by CSS (`.gallery-image-wrapper:hover .hover-overlay`, see styles.css),
// not by React state or event handlers. That means hovering can never
// trigger a re-render, a layout pass, or touch anything in the Camera /
// Gallery Renderer / virtualization pipeline -- it's a compositor-only
// opacity fade, fully decoupled from the animation-frame loop that drives
// the archive itself. The only requirement of the parent is that it already
// be a positioned element this component can fill via inset: 0, which
// .gallery-image-wrapper already is.
//
// Responsive scaling (large images get more breathing room, small images
// shrink proportionally) is handled entirely in CSS via container query
// units/breakpoints scoped to this component's own root -- not by reading
// `dimensions` in JS. `dimensions` is accepted here for forward
// compatibility with later phases that may need it for layout decisions
// this phase doesn't require; it is intentionally unused for now.
//
// Theme/tag order: shuffled once per gallery generation, stable afterward.
// `itemId` and `generation` (passed down from App -- see
// galleryGenerationRef's own comment there) are combined into a seed for a
// deterministic PRNG (mulberry32, not Math.random()). Deterministic means
// the same (itemId, generation) pair always produces the same shuffled
// order, with nothing to store or reset: hovering, scrolling, zooming, and
// virtualization unmounting/remounting this component never change either
// input, so useMemo either returns the cached order or -- if this exact
// component instance was unmounted and remounted -- recomputes the exact
// same order from scratch, which looks identical either way. Only
// regenerateGallery incrementing the generation counter (a real gallery
// regeneration) ever changes the seed and produces a new shuffle.
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  return hash;
}

function seededShuffle(list, seed) {
  const random = mulberry32(seed);
  const result = list.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function HoverOverlay({
  archiveNumber,
  themes = [],
  tags = [],
  dimensions,
  itemId,
  generation = 0,
}) {
  const shuffledThemes = useMemo(
    () => seededShuffle(themes, hashSeed(`${itemId}:themes:${generation}`)),
    [themes, itemId, generation],
  );
  const shuffledTags = useMemo(
    () => seededShuffle(tags, hashSeed(`${itemId}:tags:${generation}`)),
    [tags, itemId, generation],
  );

  // Relationship Engine wiring (Commit 2 of 3): HoverOverlay is the first
  // consumer of the Relationship Engine, but it does not perform matching
  // itself -- per the Relationship Engine's own contract, it only supplies
  // a relationship type + value and stores whatever Archive Numbers come
  // back. There is no theme interaction yet (a later commit); for now this
  // simply asks about the item's own first-shown theme, the same theme
  // priority already used for rendering. Nothing here reads
  // relatedArchiveNumbersRef.current yet -- it exists purely so a future
  // commit has it ready to consume, the same role galleryGenerationRef
  // plays for this component today. This has no effect on rendering,
  // opacity, or any existing interaction: the value is never read by the
  // JSX below.
  const relatedArchiveNumbersRef = useRef([]);
  relatedArchiveNumbersRef.current = useMemo(
    () =>
      shuffledThemes.length > 0
        ? findRelatedArchiveItems("theme", shuffledThemes[0], ARCHIVE_ITEMS)
        : [],
    [shuffledThemes],
  );

  return (
    <div className="hover-overlay" aria-hidden="true">
      {archiveNumber != null && (
        <div className="hover-overlay__number">{archiveNumber}</div>
      )}
      {shuffledThemes.length > 0 && (
        <ul className="hover-overlay__themes">
          {shuffledThemes.map((theme) => (
            <li key={theme}>{theme}</li>
          ))}
        </ul>
      )}
      {shuffledTags.length > 0 && (
        <p className="hover-overlay__tags">
          {shuffledTags.map((tag) => (
            <span className="hover-overlay__tag" key={tag}>
              {tag}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default HoverOverlay;
