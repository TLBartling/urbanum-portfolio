import { client } from "./client.js";
import { urlFor } from "./imageUrl.js";

// The one GROQ query this milestone needs. Project and Theme references
// are resolved here (to a plain slug string and a plain array of title
// strings) so normalizeArchiveItem never has to deal with raw Sanity
// reference objects. Deliberately unfiltered by displayRole -- exactly
// like ARCHIVE_ITEMS in mockArchiveItems.js, which includes its one
// Hidden record too. Filtering by displayRole is the frontend's job (see
// projectContent.js), not the CMS's -- the CMS's only responsibility is
// to store and supply structured content.
//
// `!(_id in path("drafts.**"))` excludes unpublished drafts. Without this,
// a document Josh has started editing but never published -- including
// any never-finished legacy test document -- would already be showing up
// in what's supposed to be the site's live data. This isn't a
// verification-script-only concern: a public site should never surface an
// unpublished draft, so the filter belongs in the one shared query every
// consumer (fetchArchiveItems() today, the eventual live repository
// later) goes through.
//
// `image` is projected as the raw image field (asset reference intact,
// not pre-resolved to a URL) so the image-url builder can still do
// hotspot-aware cropping later; normalizeArchiveItem receives the
// already-built URL string separately (see below for why).
//
// `description` is aliased to `caption` here -- the one field-naming
// mismatch between the locked CMS schema and the existing frontend
// contract (see the earlier compatibility audit). Aliasing it in the
// query is a normalization-layer decision; nothing downstream needs to
// know the CMS calls this field something else.
//
// Year Filter Inheritance: `"projectYear": project->year` projects the
// parent Project's own Year field alongside the already-resolved
// `project` slug above -- a second, independent field, not a replacement
// for it. `project` still resolves to nothing but the slug (Theme/Project/
// Search/the relationship engine all depend on that exact shape and are
// untouched here); `projectYear` exists purely so normalizeArchiveItem
// below can carry the parent Project's year through as its own field,
// which is what lets the Metadata Query Engine's Year predicate check it
// (see metadataQueryEngine.js's own comment on STRUCTURED_FIELD_MATCHERS.
// year for why that's the one and only place this new field is read).
//
// Type Filter Inheritance: `"projectTypes": ...` follows the exact same
// pattern as `projectYear` immediately above -- Type lives on Project,
// not on Archive Item itself (see cms/schemaTypes/projectType.js), so it
// has to be denormalized onto the item the same way for the Metadata
// Query Engine's Type predicate to have anything to check (see
// metadataQueryEngine.js's STRUCTURED_FIELD_MATCHERS.type). Output key
// here is `projectTypes` -- this is the frontend's own contract name for
// "the parent Project's Type(s), carried onto the item."
//
// CMS Type Multi-Select pass: a Project can now belong to one or more
// Types (see projectType.js's own `projectTypes` array-of-references
// field, replacing the old single `projectType` reference). This
// `select()` prefers that new array field, dereferencing every Type's
// title (`projectTypes[]->title`); if a given Project hasn't been
// migrated yet (see migrateProjectTypeToArray.js), it falls back to the
// old single `projectType` reference, wrapped as a one-item array --
// so this query is correct for every Project regardless of whether the
// migration has run against it yet. Neither field present yields an
// empty array, the "absent means absent" convention this file already
// uses throughout.
//
// Naming correction (earlier pass): the field on Project and the
// document it references were both briefly `type` -- Sanity rejects
// `type` as a document schema name ("reserved name"); both were renamed
// to `projectType`/`projectTypes` for internal naming consistency (see
// typeType.js's and projectType.js's own comments for the full
// reasoning).
// Project Filter Composition (client-requested): "aspectRatio" is the
// exact same GROQ expression the Journal query already established for
// exactly this need (see JOURNAL_ENTRIES_QUERY's own comment) -- Sanity's
// own asset metadata, not something specific to Journal Entries as a
// document type. Added here so the Project-filtered archive row
// (App.jsx's ProjectFilterRow, see its own comment) can size each image
// from its own real aspect ratio, the same "real data drives the
// landscape/portrait rhythm, not an invented pattern" rule the Journal
// grid already follows -- an Archive Item's own `image` field was the
// only thing missing this, and adding it doesn't touch the normal
// archive/DAPC composition or displayRole/sortOrder/etc, which are the
// only fields it previously supplied.
export const ARCHIVE_ITEMS_QUERY = `
  *[_type == "archiveItem" && !(_id in path("drafts.**"))] | order(sortOrder asc) {
    archiveNumber,
    image,
    "project": project->slug.current,
    "projectYear": project->year,
    "projectTypes": select(defined(project->projectTypes) => project->projectTypes[]->title, defined(project->projectType) => [project->projectType->title], []),
    "themes": themes[]->title,
    displayRole,
    sortOrder,
    year,
    fullDate,
    title,
    location,
    "caption": description,
    "aspectRatio": image.asset->metadata.dimensions.aspectRatio
  }
`;

// Reshapes one raw Sanity query result into exactly the shape a record
// in mockArchiveItems.js already has. Deliberately a pure function with
// no dependency on the Sanity client or the image-url builder -- the
// resolved image URL is passed in as `imageUrl` rather than built inside
// this function. That's not just tidiness: it means this function (the
// part that actually encodes the field-by-field mapping) can be tested
// with a plain synthetic object and no network access or installed
// Sanity packages at all, which is exactly how this milestone's field
// parity was verified (see this milestone's report).
//
// `theme` (singular): the mock contract carries this alongside `themes`
// -- every existing record's `theme` is simply its `themes[0]` (see
// HoverOverlay.jsx's own comment confirming this same relationship).
// Reproduced the same way here rather than as a separate CMS field --
// the locked schema deliberately has no singular `theme` field.
//
// `date`: the mock contract has one field, a bare year string. The
// locked schema splits this into `year` and `fullDate`. No existing mock
// record has ever combined the two, so there's no precedent to match
// exactly -- this prefers `fullDate` (if an editor entered one) and
// falls back to `String(year)`, which reproduces every existing mock
// record's shape exactly when only a year is known.
export function normalizeArchiveItem(raw, imageUrl) {
  const themes = raw.themes ?? [];

  return {
    archiveNumber: raw.archiveNumber,
    image: imageUrl,
    theme: themes[0] ?? null,
    themes,
    project: raw.project ?? null,
    title: raw.title,
    caption: raw.caption,
    location: raw.location,
    date: raw.fullDate ?? (raw.year ? String(raw.year) : undefined),
    // Year Filter Inheritance: the parent Project's own Year, carried
    // through as its own field rather than folded into `date` above --
    // `date` stays exactly what it already was (this item's own year/date,
    // however it currently gets there), and this is purely additive.
    // String(...), matching `date`'s own existing string-of-a-year
    // convention, since that's what the Year matcher in
    // metadataQueryEngine.js compares against. undefined (not null) when
    // the parent Project has no Year set, same "absent means absent"
    // convention `date` above already uses.
    projectYear: raw.projectYear != null ? String(raw.projectYear) : undefined,
    // Type Filter Inheritance: same shape as projectYear immediately
    // above -- the parent Project's own Type(s), carried through as its
    // own field. CMS Type Multi-Select pass: now an array of plain
    // strings (a Project can have one or more Types), matching `themes`
    // immediately above rather than the single-string shape this field
    // used to have -- the Type matcher in metadataQueryEngine.js checks
    // membership (`.includes(...)`), the same "array is OR logic" rule
    // `themes`/`theme` already follow. `[]` (not undefined) when the
    // parent Project has no Type set, matching `themes`' own "absent
    // means empty array" convention rather than `date`/`location`'s
    // "absent means undefined" -- this field was always denormalized and
    // plural-shaped now, so it follows the plural-field convention.
    projectTypes: raw.projectTypes ?? [],
    displayRole: raw.displayRole ?? "Default",
    sortOrder: raw.sortOrder ?? 0,
    // Project Filter Composition: same "a real number, or null" contract
    // as normalizeJournalEntry's own `aspectRatio` field immediately
    // above in this file -- null (not undefined, not a guessed default)
    // when Sanity has no dimensions metadata for this image yet, so a
    // consumer can tell "unknown" apart from "really is this ratio" and
    // apply its own fallback the same way ProjectFilterRow.jsx does.
    aspectRatio:
      typeof raw.aspectRatio === "number" ? raw.aspectRatio : null,
  };
}

// The one exported entry point this milestone needs: fetch every Archive
// Item from Sanity, already reshaped into the existing frontend content
// contract. Nothing downstream needs to know this data came from Sanity
// rather than mockArchiveItems.js -- that's the whole point of this
// milestone. Not wired into src/content/ or any component yet -- that's
// a separate, later architectural step, per this milestone's scope.
export async function fetchArchiveItems() {
  const rawItems = await client.fetch(ARCHIVE_ITEMS_QUERY);

  return rawItems.map((raw) =>
    normalizeArchiveItem(raw, raw.image ? urlFor(raw.image).url() : null),
  );
}

// -----------------------------------------------------------------------
// Projects (Phase 3). Same conventions as ARCHIVE_ITEMS_QUERY above:
// drafts excluded, ordered the same way the frontend already needs it
// (Project.sortOrder -- the same field Previous/Next Project navigation
// in projectContent.js's getProjectsInOrder already sorts by client-side,
// so the raw array server-side now matches what the frontend does with
// it, rather than relying on that client-side sort alone).
//
// `slug` is projected to its plain string (`slug.current`), the same
// pattern ARCHIVE_ITEMS_QUERY already uses for `project`/`themes` --
// normalizeProject and every downstream reader (projectContent.js's
// `p.slug === slug` checks, ProjectNavigation's URLs) expect a bare
// string, never a raw Sanity slug object.
// -----------------------------------------------------------------------
// `"types": ...` -- aliased on purpose, mirroring ARCHIVE_ITEMS_QUERY's
// own `projectTypes` field immediately above. CMS Type Multi-Select
// pass: the Sanity-side field is now `projectTypes` (an array of
// references, see cms/schemaTypes/projectType.js), and the output key
// changed from the old singular `type` to `types` to match -- every
// reader of Project.type (App.jsx's PROJECT_TYPES, most directly) was
// updated alongside this change (see this pass's own report for the
// full list). Same migration-safe `select()` fallback to the old single
// `projectType` reference as ARCHIVE_ITEMS_QUERY uses, for a Project not
// yet migrated.
export const PROJECTS_QUERY = `
  *[_type == "project" && !(_id in path("drafts.**"))] | order(sortOrder asc) {
    title,
    "slug": slug.current,
    location,
    year,
    "types": select(defined(projectTypes) => projectTypes[]->title, defined(projectType) => [projectType->title], []),
    description,
    descriptionRichText,
    sortOrder
  }
`;

// Reshapes one raw Sanity query result into exactly the shape a record in
// mockProjects.js already has. Checked field-by-field against the locked
// Project schema (cms/schemaTypes/projectType.js): title, slug, location,
// year, description, and sortOrder all map directly -- no rename needed
// here, unlike Archive Item's description -> caption alias (Project's own
// schema already calls its description field "description").
//
// `year` (Josh review, data-flow correction, final polish pass): PROJECTS_QUERY
// above has always selected `year` -- this function simply never read it,
// leaving every live Project's Year silently dropped before it could
// reach any component. Confirmed via a fresh trace (ProjectInfoPanel.jsx
// now needs a real Year for its identity block) that nothing about the
// query or schema was missing; only this mapping was incomplete. Fixed by
// exposing it directly, the same one-line mapping every other field here
// already gets.
//
// `dates`: the one field in the mock contract with no schema counterpart
// -- the locked Project schema has no free-form date-range string, only
// the numeric `year` above. Left undefined here (not invented from
// `year`) so this stays a faithful reflection of what the schema actually
// stores; `year` is the real field now, `dates` remains unread by every
// current caller.
//
// `types` (Type Filter): the mandatory field from
// cms/schemaTypes/projectType.js -- CMS Type Multi-Select pass: now an
// array (a Project can have one or more Types), mapped through with
// `raw.types ?? []` rather than a bare pass-through, matching
// normalizeArchiveItem's own `projectTypes ?? []` convention immediately
// above. An existing, not-yet-migrated Project still resolves correctly
// here, since PROJECTS_QUERY's own `select()` already falls back to the
// old single `projectType` reference wrapped as a one-item array --
// `raw.types` is only ever genuinely empty for a Project with no Type at
// all, never merely "not migrated yet."
// CMS typography foundation pass: `descriptionRichText` is projected
// alongside the existing `description` (unchanged) -- see
// cms/schemaTypes/projectType.js's own comment on that additive sibling
// field. Portable Text blocks are returned as-is (not dereferenced or
// flattened here) -- @portabletext/react (via src/RichText.jsx) consumes
// that raw block-array shape directly, same as ABOUT_PAGE_QUERY/
// CONTACT_PAGE_QUERY's own `bodyRichText` below.
export function normalizeProject(raw) {
  return {
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    // CMS typography foundation pass: passed through as-is (an array of
    // Portable Text blocks, or undefined when the field has never been
    // set) -- ProjectInfoPanel.jsx decides whether to use it or fall back
    // to `description` above.
    descriptionRichText: raw.descriptionRichText,
    location: raw.location,
    year: raw.year,
    types: raw.types ?? [],
    dates: undefined,
    sortOrder: raw.sortOrder,
  };
}

// The one exported entry point Phase 3 needs: fetch every Project from
// Sanity, already reshaped into the existing frontend content contract.
// Mirrors fetchArchiveItems() exactly -- see src/content/projects.js for
// where this gets called from and how the async boundary around it is
// contained.
export async function fetchProjects() {
  const rawProjects = await client.fetch(PROJECTS_QUERY);
  return rawProjects.map(normalizeProject);
}

// -----------------------------------------------------------------------
// Themes (Phase 4). Same conventions as ARCHIVE_ITEMS_QUERY/PROJECTS_QUERY
// above: drafts excluded. The locked Theme schema (themeType.js) has
// exactly one field, `title` -- there's no `sortOrder` field the way
// there is for Project, so this orders alphabetically by title rather
// than inventing an ordering field the schema doesn't have.
//
// This returns every Theme document that exists in Sanity, not just the
// ones already referenced by an Archive Item -- the same choice already
// made for Projects in Phase 3 (a brand-new Project with no photos yet
// still appears in the Filter). A Theme Josh creates ahead of tagging
// anything with it is expected to show up here too: the CMS is the
// source of truth for which Themes exist, not which Archive Items
// happen to reference one yet.
// -----------------------------------------------------------------------
export const THEMES_QUERY = `
  *[_type == "theme" && !(_id in path("drafts.**"))] | order(title asc) {
    title
  }
`;

// Reshapes one raw Sanity query result into the one shape this content
// type has ever had in this codebase: a bare theme name string. Every
// existing reader (HoverOverlay.jsx's theme list, the Metadata Query
// Engine's theme matcher, Header's Filter Theme category) already only
// ever expects plain strings for a theme, never an object -- there is no
// separate "Theme Object" shape to preserve the way there is for Project.
export function normalizeTheme(raw) {
  return raw.title;
}

// The one exported entry point Phase 4 needs: fetch every Theme from
// Sanity, already reshaped into the plain-string-array shape the
// frontend already expects. Mirrors fetchProjects()/fetchArchiveItems().
export async function fetchThemes() {
  const rawThemes = await client.fetch(THEMES_QUERY);
  return rawThemes.map(normalizeTheme);
}

// -----------------------------------------------------------------------
// Journal Entries (Journal CMS handshake). Same conventions as every
// query above: drafts excluded via the same
// `!(_id in path("drafts.**"))` guard. The locked Photo Journal Entry
// schema (journalEntryType.js) has no sortOrder field the way Archive
// Item and Project do, so this orders by `date desc` -- newest entry
// first, the natural reading order for "a photo journal, one moment" --
// rather than inventing an ordering field the schema doesn't have. An
// entry with no date set (the field is optional) sorts last under GROQ's
// own missing-value-sorts-last behavior, which is an acceptable default
// here and not specially handled.
//
// There is no `title` field on this document type at all (Journal Title
// Workflow removed -- see journalEntryType.js's own comment), and
// `privateNotes` stays unprojected, same as always: it's explicitly
// internal-only per its own schema description, the same treatment
// Archive Item's own privateNotes field already gets in
// ARCHIVE_ITEMS_QUERY above. `caption` is still projected here even
// though JournalPage.jsx no longer displays it anywhere (the earlier
// hover-caption treatment was removed at the client's request) --
// leaving it in the query keeps the underlying data available for any
// future surface, per that removal's own "presentation only" scope.
//
// Row-packing follow-up (Josh review): `"aspectRatio":
// image.asset->metadata.dimensions.aspectRatio` is unchanged from the
// prior follow-up (added then, not touched again by the justified-
// gallery rework below). Sanity always stores this on every image asset
// regardless of schema config -- no schema change was needed, this is
// purely an additional field in the existing projection.
export const JOURNAL_ENTRIES_QUERY = `
  *[_type == "journalEntry" && !(_id in path("drafts.**"))] | order(date desc) {
    image,
    date,
    caption,
    "aspectRatio": image.asset->metadata.dimensions.aspectRatio
  }
`;

// Reshapes one raw Sanity query result into the shape this milestone
// needs. Mirrors normalizeArchiveItem/normalizeProject's own pattern: a
// pure function, no client/image-url-builder dependency, the resolved
// image URL passed in separately as `imageUrl` (see fetchJournalEntries
// below) so this stays testable with a plain synthetic object. `date`
// and `caption` are both optional in the schema, so either may be
// undefined here.
//
// Justified-gallery follow-up (Josh review): `aspectRatio` is now passed
// through as-is (the raw width/height ratio), not collapsed into a
// derived landscape/portrait label the way the previous row-packing pass
// did. JournalPage.jsx's row-packing algorithm needs each image's actual
// ratio to compute proportional widths within a row, not just a binary
// classification -- a fixed landscape/portrait split was exactly the
// "too rigid" frame system this follow-up replaces. `null` (not a
// guessed default) when `raw.aspectRatio` is missing -- e.g. an existing
// asset uploaded before Sanity computed this metadata -- so
// JournalPage.jsx's own fallback logic handles "unknown" explicitly
// rather than this function silently picking a value.
export function normalizeJournalEntry(raw, imageUrl) {
  return {
    image: imageUrl,
    date: raw.date,
    caption: raw.caption,
    aspectRatio: typeof raw.aspectRatio === "number" ? raw.aspectRatio : null,
  };
}

// The one exported entry point this milestone needs: fetch every Photo
// Journal Entry from Sanity, already reshaped. Mirrors
// fetchThemes()/fetchProjects()/fetchArchiveItems() exactly -- see
// src/content/journalEntries.js for where this gets called from and how
// the async boundary around it is contained.
export async function fetchJournalEntries() {
  const rawEntries = await client.fetch(JOURNAL_ENTRIES_QUERY);

  return rawEntries.map((raw) =>
    normalizeJournalEntry(raw, raw.image ? urlFor(raw.image).url() : null),
  );
}

// -----------------------------------------------------------------------
// About Page (About Page CMS milestone). A singleton, not a collection --
// unlike every query above, this fetches at most one document, so it
// takes `[0]` rather than ordering/mapping over an array. Same
// drafts-excluded guard as every other query here, for the same reason:
// an unpublished in-progress edit should never be what a visitor sees.
//
// Deliberately does NOT project an image field -- the About page's
// right-side image is not a field on this document at all. It reuses the
// existing Archive Item `displayRole: 'Featured'` concept instead (see
// src/AboutPage.jsx's own comment for the full reasoning), which is
// already fetched via ARCHIVE_ITEMS_QUERY/getArchiveItems() -- no second
// image pipeline, no new query needed for it.
// -----------------------------------------------------------------------
// CMS typography foundation pass: `bodyRichText` is projected alongside
// the existing `body` (unchanged) -- see cms/schemaTypes/aboutPageType.js's
// own comment on that additive sibling field.
export const ABOUT_PAGE_QUERY = `
  *[_type == "aboutPage" && !(_id in path("drafts.**"))][0] {
    title,
    subtitle,
    body,
    bodyRichText
  }
`;

// Reshapes the one raw Sanity result into the shape src/AboutPage.jsx
// reads. `raw` is null/undefined until an editor has actually created
// and published the About Page document -- returning null (not an
// object with blank fields) lets the frontend's own presence guards
// (matching the pattern already established in ProjectInfoPanel.jsx: an
// absent field simply doesn't render, rather than rendering an empty
// heading/paragraph) decide what "no About Page content yet" looks like.
export function normalizeAboutPage(raw) {
  if (!raw) return null;

  return {
    title: raw.title,
    subtitle: raw.subtitle,
    body: raw.body,
    bodyRichText: raw.bodyRichText,
  };
}

// The one exported entry point this milestone needs: fetch the About
// Page singleton from Sanity, already reshaped. Mirrors
// fetchThemes()/fetchProjects()/fetchArchiveItems() exactly -- see
// src/content/aboutPage.js for where this gets called from and how the
// async boundary around it is contained.
export async function fetchAboutPage() {
  const raw = await client.fetch(ABOUT_PAGE_QUERY);
  return normalizeAboutPage(raw);
}

// -----------------------------------------------------------------------
// Contact Page (Contact drawer -> Contact page milestone)
//
// Exactly the same shape as ABOUT_PAGE_QUERY/normalizeAboutPage/
// fetchAboutPage directly above -- same three fields, same singleton
// `[0]` lookup, same draft-exclusion filter -- just against `contactPage`
// instead of `aboutPage`. See cms/schemaTypes/contactPageType.js for why
// Contact reuses this exact field shape rather than a new one.
// -----------------------------------------------------------------------
// CMS typography foundation pass: `bodyRichText` projected alongside the
// existing `body`, same as ABOUT_PAGE_QUERY above -- see
// cms/schemaTypes/contactPageType.js's own comment.
export const CONTACT_PAGE_QUERY = `
  *[_type == "contactPage" && !(_id in path("drafts.**"))][0] {
    title,
    subtitle,
    body,
    bodyRichText
  }
`;

export function normalizeContactPage(raw) {
  if (!raw) return null;

  return {
    title: raw.title,
    subtitle: raw.subtitle,
    body: raw.body,
    bodyRichText: raw.bodyRichText,
  };
}

// Mirrors fetchAboutPage() exactly -- see src/content/contactPage.js for
// where this gets called from.
export async function fetchContactPage() {
  const raw = await client.fetch(CONTACT_PAGE_QUERY);
  return normalizeContactPage(raw);
}
