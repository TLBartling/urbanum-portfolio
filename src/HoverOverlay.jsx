import { useMemo } from "react";
import { findRelatedArchiveItems } from "./relationshipEngine";
import { ARCHIVE_ITEMS } from "./mockArchiveItems";

// HoverOverlay -- presentation, plus stable per-generation randomization of
// theme/tag order.
//
// A reusable, purely presentational component: given an image's metadata,
// it renders a translucent metadata layer sized to fill its parent exactly.
// Its own visibility is still driven entirely by CSS
// (`.gallery-image-wrapper:hover .hover-overlay`, see styles.css) -- that
// compositor-only opacity fade is untouched, still fully decoupled from the
// animation-frame loop that drives the archive itself, and never re-runs
// just because this component re-renders. The only requirement of the
// parent is that it already be a positioned element this component can
// fill via inset: 0, which .gallery-image-wrapper already is.
//
// Relationship trigger, metadata-driven (moved off image hover in this
// commit): earlier, simply hovering the image fired a Relationship Engine
// query automatically. Now the image hover only ever reveals this card
// (still pure CSS, untouched) -- querying the engine is the job of the
// individual theme/tag elements rendered below, each with its own
// onMouseEnter/onMouseLeave. .hover-overlay itself keeps pointer-events:
// none (unchanged), so the card as a whole still doesn't intercept clicks
// meant for the image/button beneath it; only the individual
// `.hover-overlay__themes li` / `.hover-overlay__tag` elements opt back in
// with their own pointer-events: auto (see styles.css) so they alone can
// receive real hover events. Because those elements are still DOM
// descendants of .gallery-image-wrapper, moving the pointer from the plain
// image onto one of them never interrupts that button's own :hover state
// (CSS :hover applies to an element whenever the pointer is over it or any
// descendant) -- so this card stays open and stable the whole time, with
// no JS needed to hold it open.
//
// Hover/Click separation (this commit): hover and click on the same
// theme/tag element now have different, deliberately non-overlapping
// jobs. Hover (above) is a temporary Relationship Engine preview only --
// it never touches gallery state. Click commits: it hands the same
// {field, value} straight up to onMetadataCommit, which App.jsx wires to
// the exact same Metadata Query pipeline (queryArchive/applyMetadataQuery
// /regenerateGallery) Search and Filter already share, via
// handleFilterChange -- see App.jsx's own comment at the call site. This
// component still performs no matching, holds no query or gallery state,
// and does not navigate; it only reports what was clicked, exactly as it
// already only reports what was hovered.
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
  onRelatedArchiveNumbersChange,
  onMetadataCommit,
  // Discovery is the first eligibility gate: an editorial boolean (see
  // COLUMN_PATTERNS) deciding whether this tile may show metadata at all.
  // Defaults to false so an unspecified call site shows no metadata, never
  // everything. Geometry/container queries still decide how much is shown
  // once eligible -- see the `discovery &&` checks below.
  discovery = false,
}) {
  // Metadata-budget prototype: the first entry in `themes` is always the
  // Archive Item's designated primary theme (item.theme, the singular
  // Content Contract field App.jsx already resolves this array from --
  // verified true for every real record today). Previously this whole
  // array was shuffled uniformly, so which theme rendered first was a
  // per-generation coin flip, not an editorial choice. Now only themes[1:]
  // are shuffled among themselves; themes[0] stays pinned in place, so the
  // priority-order reveal below (primary theme first, everything else
  // after) is a real guarantee rather than incidental.
  const shuffledThemes = useMemo(() => {
    if (themes.length === 0) return [];
    const [primary, ...rest] = themes;
    return [
      primary,
      ...seededShuffle(rest, hashSeed(`${itemId}:themes:${generation}`)),
    ];
  }, [themes, itemId, generation]);
  const shuffledTags = useMemo(
    () => seededShuffle(tags, hashSeed(`${itemId}:tags:${generation}`)),
    [tags, itemId, generation],
  );

  // Relationship Engine wiring, now metadata-driven: each call below
  // supplies a relationship type + value and reports whatever Archive
  // Numbers come back straight to Gallery (App.jsx), via the same
  // onRelatedArchiveNumbersChange callback wired in an earlier commit --
  // HoverOverlay still does not perform matching itself and still does not
  // hold the shared relatedArchiveNumbers state itself, per the
  // Relationship Engine's own contract. What changed is only the trigger:
  // these fire on an individual theme/tag's own hover (below), not on the
  // image's hover, and not automatically for "the first theme" the way an
  // earlier commit did. Leaving a theme/tag reports [] immediately, same
  // as leaving the image used to.
  const handleThemeHoverStart = (theme) => {
    onRelatedArchiveNumbersChange?.(
      findRelatedArchiveItems("theme", theme, ARCHIVE_ITEMS),
    );
  };
  const handleTagHoverStart = (tag) => {
    onRelatedArchiveNumbersChange?.(
      findRelatedArchiveItems("tag", tag, ARCHIVE_ITEMS),
    );
  };
  const handleMetadataHoverEnd = () => {
    onRelatedArchiveNumbersChange?.([]);
  };

  // Hover/Click separation: hover (above) only ever previews via the
  // Relationship Engine and never touches gallery state. A click commits
  // -- it hands the same {field, value} shape straight up to App.jsx's
  // onMetadataCommit (handleMetadataFilterCommit), which is a thin
  // wrapper around the existing handleFilterChange/Metadata Query
  // pipeline Search and Filter already share. HoverOverlay itself still
  // performs no matching and holds no query/gallery state -- it only ever
  // reports which field+value was clicked, exactly as it already only
  // ever reports which field+value was hovered.
  //
  // event.stopPropagation() is required, not optional: these elements are
  // DOM descendants of the gallery tile's own <button> (see App.jsx),
  // which has its own onClick (navigate to the item's Project, or
  // open focus/zoom). Without stopping propagation here, a Theme/Tag
  // click would also fire that navigation/focus -- exactly what the
  // "Do NOT navigate" requirement for this interaction rules out.
  const handleThemeClick = (event, theme) => {
    event.stopPropagation();
    onMetadataCommit?.("theme", theme);
  };
  const handleTagClick = (event, tag) => {
    event.stopPropagation();
    onMetadataCommit?.("tag", tag);
  };

  return (
    <div className="hover-overlay" aria-hidden="true">
      {archiveNumber != null && (
        <div className="hover-overlay__number">{archiveNumber}</div>
      )}
      {/* Discovery: the only editorial gate, checked before container
          queries ever run. Non-discovery tiles never render this markup, so
          styles.css has nothing to measure. Discovery tiles always attempt
          to render -- responsive typography (see styles.css) decides how
          large the text appears, shrinking smoothly down to a 9px floor;
          only genuine physical impossibility at that floor (a container too
          small to hold even the shortest single line) results in no visible
          themes, never a separate editorial decision. */}
      {discovery && shuffledThemes.length > 0 && (
        <ul className="hover-overlay__themes">
          {shuffledThemes.map((theme) => (
            <li
              key={theme}
              onMouseEnter={() => handleThemeHoverStart(theme)}
              onMouseLeave={handleMetadataHoverEnd}
              onClick={(event) => handleThemeClick(event, theme)}
            >
              {theme}
            </li>
          ))}
        </ul>
      )}
      {discovery && shuffledTags.length > 0 && (
        <p className="hover-overlay__tags">
          {shuffledTags.map((tag) => (
            <span
              className="hover-overlay__tag"
              key={tag}
              onMouseEnter={() => handleTagHoverStart(tag)}
              onMouseLeave={handleMetadataHoverEnd}
              onClick={(event) => handleTagClick(event, tag)}
            >
              {tag}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default HoverOverlay;
