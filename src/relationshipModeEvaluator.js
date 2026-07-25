// Relationship Mode Evaluator -- a small, reusable architectural layer
// sitting between the Relationship Engine and the UI. The two are
// deliberately separate responsibilities:
//
//   Relationship Engine (relationshipEngine.js, untouched by this file)
//     "Given metadata, what archive items are related?"
//
//   Relationship Mode Evaluator (this file)
//     "Should the UI visualize those relationships right now?"
//
// This module answers only the second question, and it answers it the
// same way regardless of what triggered it: a theme/tag hover today, or a
// future Search, Filter, or Zoom Mode relationship -- none of that is this
// file's concern. It is pure, framework-agnostic, and takes only plain
// arrays of archive numbers; it does not import React, the DOM, GSAP,
// ARCHIVE_ITEMS, or anything from relationshipEngine.js/metadataQueryEngine.js.
//
// Design intent: one image on its own is not a visual relationship -- a
// visitor needs a second, actually-visible related image to discover
// before a relationship reads as real rather than as a single dimmed/
// undimmed image that looks like a rendering glitch. So Relationship Mode
// activates only once at least two distinct candidate archive numbers are
// also present in whatever gallery is currently active.
//
// candidateArchiveNumbers: the Relationship Engine's own return value,
// exactly as produced by findRelatedArchiveItems -- unfiltered, unsorted,
// untouched.
//
// activeGalleryArchiveNumbers: the archive numbers currently present in
// the active gallery -- the default gallery, a Search result, a Filter
// result, or (in the future) a Zoom gallery. This is intentionally just
// "whatever is currently active," never "the entire archive": the caller
// is responsible for handing this function the right scope, but this
// function itself never special-cases which mode produced it. Duplicate
// entries (the same archive number appearing in more than one gallery
// tile) are expected and handled here -- this counts distinct archive
// items, not tile occurrences.
//
// Returns true only when two or more distinct candidate archive numbers
// are found among activeGalleryArchiveNumbers; false otherwise (including
// for malformed input), which callers should treat as "leave the
// interface exactly as it is" -- this function only ever answers the
// activation question, it never mutates or filters anything itself.
export function shouldActivateRelationshipMode(
  candidateArchiveNumbers,
  activeGalleryArchiveNumbers,
) {
  if (
    !Array.isArray(candidateArchiveNumbers) ||
    !Array.isArray(activeGalleryArchiveNumbers) ||
    candidateArchiveNumbers.length === 0 ||
    activeGalleryArchiveNumbers.length === 0
  ) {
    return false;
  }

  const visibleArchiveNumbers = new Set(activeGalleryArchiveNumbers);
  const visibleCandidateCount = new Set(
    candidateArchiveNumbers.filter((archiveNumber) =>
      visibleArchiveNumbers.has(archiveNumber),
    ),
  ).size;

  return visibleCandidateCount >= 2;
}
