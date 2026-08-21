// Metadata Query Engine -- architecture only.
//
// This is the single place that answers one question: "given this metadata
// query, which Archive Items match?" Nothing else. It does not know what
// Search is, what a Filter UI looks like, how results get rendered, or that
// a Sanity CMS handshake will eventually replace archiveItems with a live
// query result. Search, Filters, Combined Search + Filters, and the future
// CMS handshake are all expected to become thin callers of queryArchive
// below -- this file has no knowledge of any of them and imports nothing
// from React, the DOM, App.jsx, HoverOverlay, the Relationship Engine, the
// Camera/Navigator, or GSAP. It is pure data in, pure data out.
//
// Contract:
//   queryArchive(query, archiveItems) -> Archive Item[]
//   - Never mutates archiveItems or any item within it.
//   - Never sorts or reorders -- results come back in archiveItems' own
//     order, filtered down. Ordering is a presentation concern for whoever
//     calls this, not this engine's job.
//   - Never triggers gallery regeneration or any other side effect. Calling
//     this twice with the same arguments always produces two structurally
//     equal (fresh) arrays.
//   - Unknown query fields are silently ignored rather than throwing or
//     excluding everything -- this keeps the engine forward-compatible with
//     query objects a future caller (e.g. Combined Search + Filters) might
//     build up incrementally with fields this foundation doesn't know about
//     yet.
//
// Supported query fields (foundation only -- see the module comment above
// for why this list is deliberately short):
//   search  -- free-text, matched case-insensitively as a substring against
//              several fields (see matchesSearch below). A year typed into
//              Search is matched the same way the Year filter matches one
//              -- see getYearFieldValues below, the one shared place both
//              read an item's own year and its inherited Project year from.
//   theme   -- structured field, string or array of strings.
//   project -- structured field, string or array of strings.
//   type    -- structured field, string or array of strings. Matches an
//              item's parent Project's own Type (denormalized onto the
//              item as `projectType` -- see cms/queries.js's
//              normalizeArchiveItem), the same denormalize-and-match
//              shape `project` immediately above already uses for
//              Project itself. No item-level override the way `year` has
//              (Type lives only on Project, never on Archive Item -- see
//              cms/schemaTypes/projectType.js), so this is a single,
//              direct equality check, not an either-one-counts pair.
//   year    -- structured field, string/array of strings, PLUS one special
//              value shape: `{ before: <number> }`, matching any item whose
//              year is strictly earlier than that number. An explicit-year
//              string still matches an Archive Item whose own `date` field
//              carries that year, OR whose parent Project's own Year
//              (denormalized onto the item as `projectYear` -- see
//              cms/queries.js's normalizeArchiveItem) carries it. Either
//              one is sufficient; an item does not need both. This exists
//              because some Archive Items store their year at the Project
//              level rather than their own -- without this, such an item
//              would never surface under any Year filter at all.
//              `{ before: N }` exists for Header's "Earlier" bucket: rather
//              than this engine hardcoding what year "Earlier" means (which
//              would need editing here every time Header's own list of
//              explicit years changes), the caller supplies whatever cutoff
//              is currently correct -- see App.jsx's EARLIER_CUTOFF_YEAR,
//              derived from Header's own MOCK_YEARS list, for where that
//              number actually comes from. This engine only ever does the
//              comparison; it has no opinion on which year the cutoff is.
//
// Structured-field matching:
//   - A single value (`theme: "Residential"`) and an array of values
//     (`theme: ["Residential", "Commercial"]`) are both accepted; an array
//     is OR logic -- an item matches if it satisfies ANY value in the
//     array.
//   - Different fields combine with AND logic -- an item must satisfy every
//     structured field present in the query, plus the search term if one is
//     present.
//   - An absent field, a null/undefined value, or an empty array all mean
//     "this field does not constrain the query" -- the same as the field
//     not being present at all. This mirrors how a Filter UI will typically
//     represent "no selection made in this group" and keeps `queryArchive`
//     from having to know the difference between "field omitted" and
//     "field explicitly cleared."
//
// theme matching specifically checks both the legacy singular `theme` field
// and the richer `themes` array (see mockArchiveItems.js's own comments on
// why both fields currently exist side by side) -- a query for a theme
// value should match an item regardless of which of the two fields
// currently carries it, since that split is an internal data-shape detail
// this engine's callers shouldn't need to know about.
// "Earlier" Bucket: pulls a leading 4-digit year out of whatever a year
// field currently holds -- a bare year string ("2024") or a full date
// string (fullDate-backed `date` values look like "2023-06-15") -- so the
// `before` comparison below works the same regardless of which shape this
// particular item's year happens to be in. Only used by the `before`
// branch: the pre-existing exact-match branch (ownYear === String(value),
// via getYearFieldValues below) is untouched and keeps its own existing
// behavior exactly as it was, fullDate items included.
//
// Year Filter -- Live Data: exported so App.jsx can reuse this exact same
// parsing rule when deriving the Year category's own live option list from
// getArchiveItems() (see ARCHIVE_YEARS_NUMERIC in App()) -- one
// implementation of "how to read a year out of this data shape," not a
// second copy that could drift from what this matcher itself accepts.
export function extractYearNumber(value) {
  if (typeof value !== "string") {
    return NaN;
  }
  return Number.parseInt(value.slice(0, 4), 10);
}

// Year Field Inheritance (shared): the two fields that together represent
// an Archive Item's year -- its own `date` field, and its parent Project's
// year, denormalized onto the item as `projectYear` (see cms/queries.js's
// normalizeArchiveItem). Search Year Inheritance: this is the one place
// that pair is read from. The year matcher below (both its exact-match and
// `{ before }` branches) and matchesSearch further down each call this
// instead of hardcoding item.date/item.projectYear separately -- so Search
// and the Year filter read an item's year through the exact same function
// and cannot drift out of sync with each other the way two independent
// copies of "item.date, item.projectYear" could. Either value being absent
// (undefined, for an item with no own date or no parent Project year) is
// left as-is here; each caller already handles that the same way it always
// did -- String(undefined) never equals a real query value in the exact-
// match branch, extractYearNumber(undefined) is NaN and excluded by
// Number.isFinite in the `before` branch, and matchesSearch's own
// typeof-string filter already drops non-string values before building its
// haystack.
function getYearFieldValues(item) {
  return [item.date, item.projectYear];
}

const STRUCTURED_FIELD_MATCHERS = {
  theme: (item, value) =>
    item.theme === value ||
    (Array.isArray(item.themes) && item.themes.includes(value)),
  project: (item, value) => item.project === String(value),
  // Type Filter: item.projectType is the parent Project's own Type,
  // denormalized onto the item exactly the way project (immediately
  // above) and projectYear (see year, below) already are -- see this
  // file's own module-comment entry for `type` above.
  type: (item, value) => item.projectType === String(value),
  year: (item, value) => {
    const [ownYear, projectYear] = getYearFieldValues(item);
    // "Earlier" Bucket: a `{ before: N }` value (see this file's own
    // module-comment entry for `year` above) means "strictly earlier than
    // N," checked against both the item's own year and its parent
    // Project's year -- the same either-one-is-enough shape the exact-match
    // branch below already uses for Year Filter Inheritance, just as a
    // comparison instead of an equality check.
    if (value && typeof value === "object" && "before" in value) {
      const ownYearNumber = extractYearNumber(ownYear);
      const projectYearNumber = extractYearNumber(projectYear);
      return (
        (Number.isFinite(ownYearNumber) && ownYearNumber < value.before) ||
        (Number.isFinite(projectYearNumber) && projectYearNumber < value.before)
      );
    }
    // Year Filter Inheritance: an item matches either on its own year OR
    // its parent Project's year -- see this file's own module-comment
    // entry for `year` above for the full reasoning. Behaviorally
    // unchanged from before this refactor; every other structured field,
    // Search's non-year fields, and the relationship engine (a separate
    // module entirely) remain untouched.
    return ownYear === String(value) || projectYear === String(value);
  },
};

function matchesStructuredField(item, field, rawValue) {
  if (rawValue == null) {
    return true;
  }
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  if (values.length === 0) {
    return true;
  }
  const matcher = STRUCTURED_FIELD_MATCHERS[field];
  return values.some((value) => matcher(item, value));
}

// Search: case-insensitive substring match (MVP -- no fuzzy matching, no
// tokenization) against archiveNumber, project, theme, themes, and year.
// Joined with a separator character that can't appear inside any of these
// values, so a search term can never "leak" across two adjacent fields and
// false-positive match.
//
// Search Year Inheritance: year is read via getYearFieldValues above, the
// same function the Year filter's own matcher uses -- so a search for a
// year matches an Archive Item on either its own year OR its parent
// Project's year, exactly like the Year filter already does, through the
// one shared definition of "an item's year" rather than a second copy of
// that inheritance rule living here.
function matchesSearch(item, rawSearchTerm) {
  if (typeof rawSearchTerm !== "string") {
    return true;
  }
  const term = rawSearchTerm.trim().toLowerCase();
  if (term === "") {
    return true;
  }
  const searchableValues = [
    item.archiveNumber,
    item.project,
    item.theme,
    ...(Array.isArray(item.themes) ? item.themes : []),
    ...getYearFieldValues(item),
  ].filter((value) => typeof value === "string");
  const haystack = searchableValues.join(" ").toLowerCase();
  return haystack.includes(term);
}

// queryArchive -- the one export. See the module comment above for the full
// contract; this function itself stays intentionally small: it never
// mutates `archiveItems` (Array.prototype.filter always returns a new
// array, and neither matchesSearch nor matchesStructuredField write to
// anything they're passed) and never sorts (filter preserves the input
// order of whatever it keeps).
export function queryArchive(query, archiveItems) {
  if (!Array.isArray(archiveItems)) {
    return [];
  }
  const safeQuery = query && typeof query === "object" ? query : {};

  return archiveItems.filter((item) => {
    if (!matchesSearch(item, safeQuery.search)) {
      return false;
    }
    return Object.keys(STRUCTURED_FIELD_MATCHERS).every((field) =>
      matchesStructuredField(item, field, safeQuery[field]),
    );
  });
}
