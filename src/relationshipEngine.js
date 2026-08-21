// Relationship Engine -- metadata matching only.
//
// This module answers exactly one question: "Given metadata, which Archive
// Items match?" It is a pure function with no knowledge of hover, opacity,
// CSS, animation, rendering, filtering, or searching -- those belong to
// other subsystems and later commits (Commit 2+ will have Hover Theme
// *consume* this engine; this engine never reaches back into HoverOverlay,
// CSS, or anything else). It also has no opinion about where Archive Item
// metadata came from: mock data today, Sanity CMS tomorrow, no difference
// -- it only ever reads the frontend data contract's fields (see
// mockArchiveItems.js's own header comment for that contract's shape).
//
// v1 supports exact matching only, across three relationship types: theme,
// project, year. No fuzzy search, no scoring, no weighting, no
// synonyms, no ranking -- simple exact comparisons only.
//
// Nothing in the UI calls this yet. It is infrastructure only, created and
// exported so a later commit can wire it up.

// theme/project/year each match a single scalar field on the Archive Item
// directly.
//
// Note on `year`: the frontend data contract (mockArchiveItems.js) has no
// separate `year` field -- it has `date`, and at v1 every record that sets
// `date` already uses a year-granularity string ("2026", "2024", ...). So
// `year` is mapped to the contract's existing `date` field as-is, with no
// parsing or extraction introduced here. If `date` ever becomes a finer
// grained value than a bare year, reconciling that is a later commit's
// concern, not this one.
const RELATIONSHIP_FIELDS = {
  theme: "theme",
  project: "project",
  year: "date",
};

/**
 * findRelatedArchiveItems -- the Relationship Engine's one public function.
 *
 * Pure function. No UI references, no rendering, no side effects.
 *
 * @param {"theme"|"project"|"year"} relationshipType
 * @param {string} relationshipValue
 * @param {Array<object>} archiveItems - Archive Item records, the same
 *   shape ARCHIVE_ITEMS in mockArchiveItems.js exports.
 * @returns {string[]} matchingArchiveItemIDs -- each matching Archive
 *   Item's own `archiveNumber`, in the same order as the input
 *   `archiveItems`.
 */
export function findRelatedArchiveItems(
  relationshipType,
  relationshipValue,
  archiveItems,
) {
  if (!Array.isArray(archiveItems) || relationshipValue == null) {
    return [];
  }

  const field = RELATIONSHIP_FIELDS[relationshipType];
  if (!field) {
    return [];
  }

  return archiveItems
    .filter((item) => item[field] === relationshipValue)
    .map((item) => item.archiveNumber);
}
