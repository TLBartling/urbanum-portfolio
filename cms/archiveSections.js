import {ArchiveIcon} from '@sanity/icons/Archive'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {TagIcon} from '@sanity/icons/Tag'
import {BookIcon} from '@sanity/icons/Book'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

// Navigation-architecture pass ("one Archive application, four sections"):
// the single source of truth for the Archive's four sections, born out of
// the investigation into why Structure Tool's own pane layout can't
// support a persistent nav pane (see the delivered investigation notes for
// the full reasoning -- no public API to pin a pane, and the internal
// pieces that could are explicitly @internal/@hidden). The fix isn't to
// fight the pane-collapse algorithm; it's to remove the cause of it. Each
// of these four is now its own single-document-type Structure Tool
// (`structureTool({structure: (S) => S.documentTypeList(type)})`, Sanity's
// own documented pattern for this shape -- see structure.js), which keeps
// every one of them at a maximum pane depth of two (type list, then a
// document) instead of three, so Sanity's own default collapse behavior
// never has a reason to trigger. What unifies the four into what reads as
// one "Archive" to Josh is the persistent rail (UrbanumArchiveNav.jsx),
// rendered via `studio.components.activeToolLayout`
// (UrbanumArchiveLayout.jsx) -- real Urbanum chrome, not a Structure Tool
// pane, so it can never collapse the way a pane can.
//
// Every file that needs to know "what are the Archive's sections, in what
// order, under what group" reads from this one array -- sanity.config.js's
// tool registration, structure.js's four resolvers, UrbanumToolMenu.jsx's
// top-nav active-state detection, UrbanumArchiveLayout.jsx's "is this an
// Archive tool" check, and the rail itself -- so the four tool names can
// never drift out of sync with each other. `name` is each tool's own
// internal route segment (never shown to Josh as-is); `title` is what
// Sanity's own tool metadata calls it; `group` is which labeled cluster
// the rail renders it under ("Archive" vs. "Journal" -- see
// UrbanumArchiveNav.jsx).
// Archive polish pass ("Archive list usability"): `defaultOrdering` is a
// fully public, documented `DocumentListBuilder` method (confirmed against
// the installed sanity@6.7.0 source -- `defaultOrdering(ordering)` on the
// same builder `structure.js`'s `S.documentTypeList()` already returns),
// added here rather than hardcoded per-section in structure.js so it stays
// alongside every other per-section fact this file is already the single
// source of truth for. Before this, every one of the four lists opened
// sorted by Sanity's own stock default -- Updated At -- which reorders the
// list every time Josh so much as touches a field on any item in it. None
// of these four orderings are guesses: each matches the order the
// underlying field already carries real meaning in elsewhere in this
// project (see the per-entry comments below).
//
// CMS-completion pass: this array now holds five entries, not four --
// "About Page" was added below (`group: 'Journal'`) alongside Photo
// Journal. It's shaped differently from the original four (no
// `defaultOrdering`, since it isn't a browsable list -- see its own
// per-entry comment), but it plugs into every one of the shared
// mechanisms this file documents above exactly the same way: tool
// registration, the rail's Archive-tool detection, and the rail's own
// grouped listing all still just read this array generically.
export const ARCHIVE_SECTIONS = [
  {
    name: 'archiveItems',
    title: 'Archive Items',
    schemaType: 'archiveItem',
    icon: ArchiveIcon,
    group: 'Archive',
    // Archive list draft-visibility follow-up ("sort by Last Edited"):
    // investigated as a simpler, fully supported alternative to exposing
    // draft state directly in this type's own preview.prepare() (that
    // approach was implemented, found not to work -- Structure Tool list
    // rows are keyed to the published document, which preview.prepare()
    // has no way around -- and reverted). This is a straightforward,
    // fully native, documented configuration change: '_updatedAt' /
    // 'desc' is not a new mechanism, it's the exact field and direction
    // Structure Tool's own stock "Last edited" sort option already uses
    // (confirmed against the installed source's own ORDER_BY_UPDATED_AT
    // constant), applied through the same public `defaultOrdering()` call
    // this section already used for Archive Number. It's also this
    // list's original stock default, before the "Archive list usability"
    // pass above moved it to Archive Number descending -- that pass is
    // still the right call for ordinary browsing (a stable order that
    // doesn't reshuffle every time a field is touched), but it traded
    // away the one moment Last Edited is genuinely more useful: arriving
    // here via "Continue Editing," the item just worked on -- almost
    // always the one with an unpublished draft -- now surfaces at the
    // top instead of sitting wherever its archive number happens to
    // place it, and any other items with pending drafts cluster near it
    // for the same reason. This only changes which order the list opens
    // with. The Sort menu itself -- this type's own "Archive Number
    // (Oldest First)" schema ordering, plus Structure Tool's stock Last
    // Edited/Created options -- is assembled independently of this
    // setting (confirmed against the installed source's
    // getOrderingMenuItemsForSchemaType, which reads only the schema's
    // own `orderings` plus its own fixed stock list, never this value),
    // so Josh can still pick any other order from that menu exactly as
    // before; this only changes where the list starts.
    defaultOrdering: [{field: '_updatedAt', direction: 'desc'}],
  },
  {
    name: 'projects',
    title: 'Projects',
    schemaType: 'project',
    icon: ProjectsIcon,
    group: 'Archive',
    // The same curated order the live site's own Previous/Next Project
    // navigation already uses (projectType.js's own `sortOrder` field,
    // "Lower numbers appear first") -- browsing Projects here now matches
    // browsing them on the site, instead of an unrelated edit-recency
    // order.
    defaultOrdering: [{field: 'sortOrder', direction: 'asc'}],
  },
  {
    name: 'themes',
    title: 'Themes',
    schemaType: 'theme',
    icon: TagIcon,
    group: 'Archive',
    // Themes is a flat, growing controlled vocabulary with no curated
    // order of its own (unlike Project's sortOrder) -- alphabetical by
    // title is what makes a specific one findable by scanning, the same
    // reason a glossary or index is alphabetized rather than dated.
    defaultOrdering: [{field: 'title', direction: 'asc'}],
  },
  {
    name: 'photoJournal',
    title: 'Photo Journal',
    schemaType: 'journalEntry',
    icon: BookIcon,
    group: 'Journal',
    // A journal reads chronologically -- newest entry first, the ordinary
    // expectation for a journal/log, using the entry's own `date` field
    // rather than editing recency.
    defaultOrdering: [{field: 'date', direction: 'desc'}],
  },
  {
    // CMS-completion pass ("finish the About Page CMS implementation"):
    // About Page moved here from being its own standalone 5th Structure
    // Tool + 4th top-nav group (About Page CMS milestone's original
    // placement). That placement was the actual reason Josh couldn't find
    // it: About Page never appeared inside the Archive/Journal rail he
    // already uses to reach Photo Journal, only behind a brand-new,
    // easy-to-miss top-nav link nobody told him to look for. Filing it
    // here instead -- as a fifth ARCHIVE_SECTIONS entry with
    // `group: 'Journal'` -- means every mechanism that already reads this
    // array picks it up automatically and for free: sanity.config.js's
    // `plugins: ARCHIVE_SECTIONS.map(...)` registers its Structure Tool,
    // `ARCHIVE_TOOL_NAMES` (below) makes UrbanumArchiveLayout.jsx treat it
    // as part of the Archive app (so the persistent rail renders while
    // it's open), and UrbanumArchiveNav.jsx's own `group === 'Journal'`
    // filter lists it directly beneath Photo Journal under the rail's
    // "JOURNAL" label -- exactly "Journal -> Photo Journal / About Page,"
    // with no changes needed to either of those two files.
    //
    // It does NOT get a `defaultOrdering` -- that option only means
    // anything for `S.documentTypeList()` (see structure.js's
    // `sectionStructure`), and About Page is a singleton opened via
    // `S.document().schemaType('aboutPage').documentId('aboutPage')`
    // (structure.js's own `aboutPageStructure`, unchanged from the
    // original milestone) -- there's exactly one document, nothing to
    // order.
    name: 'aboutPage',
    title: 'About Page',
    schemaType: 'aboutPage',
    icon: DocumentTextIcon,
    group: 'Journal',
  },
]

// The section Josh lands on the moment he clicks "Archive" in the top nav,
// and the destination "View Archive" (ImportWorkspace.jsx) navigates to
// after publishing -- "Archive should always open directly into Archive
// Items," per the brief, the same way Finder opens straight into
// Documents. Also what UrbanumToolMenu.jsx's own "Archive" link targets.
export const DEFAULT_ARCHIVE_TOOL_NAME = 'archiveItems'

// Every one of the four tool names, for "is Josh currently anywhere in the
// Archive" checks (UrbanumToolMenu.jsx's top-nav highlighting,
// UrbanumArchiveLayout.jsx's rail-or-not decision) -- Josh should never
// see the top nav's "Archive" link go inactive just because he's on
// Projects instead of Archive Items; from his side, he's still in the
// Archive.
export const ARCHIVE_TOOL_NAMES = ARCHIVE_SECTIONS.map((section) => section.name)
