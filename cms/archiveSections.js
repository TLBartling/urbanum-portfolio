import {ArchiveIcon} from '@sanity/icons/Archive'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {TagIcon} from '@sanity/icons/Tag'
import {BookIcon} from '@sanity/icons/Book'

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
export const ARCHIVE_SECTIONS = [
  {
    name: 'archiveItems',
    title: 'Archive Items',
    schemaType: 'archiveItem',
    icon: ArchiveIcon,
    group: 'Archive',
    // Newest import first -- the same "most recent first" mental model
    // the Uploader's own Recent Projects/Themes pills already use
    // (ImportWorkspace.jsx's recentThemeIds/recentTags). archiveNumber is
    // a zero-padded string ("001", "002", ...), so a plain string `desc`
    // sort is numerically correct for every normally-assigned value (see
    // ArchiveNumberInput.jsx's own PAD_LENGTH). The one known exception is
    // the legacy unpublished "AR-0001" test draft that file's own comment
    // already documents -- its non-numeric prefix sorts ahead of every
    // real value under `desc`, a pre-existing data quirk this ordering
    // change surfaces rather than causes, and one that resolves itself the
    // moment that draft is permanently deleted (already the documented
    // path forward in ArchiveNumberInput.jsx).
    defaultOrdering: [{field: 'archiveNumber', direction: 'desc'}],
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
