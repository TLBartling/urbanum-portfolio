import {ARCHIVE_SECTIONS} from './archiveSections'

// Navigation-architecture pass ("one Archive application, four sections"):
// this file used to define ONE Structure Tool's nested list (a root menu
// of four items, each opening a child document-type list) -- exactly the
// three-pane-deep shape (menu -> type list -> document) that made
// Sanity's own pane-collapse algorithm start hiding the root menu the
// moment a document was open, with no public API to stop it (see the
// delivered investigation notes for the full mechanics). Rather than
// fight that, each of the four sections is now its OWN Structure Tool
// (see sanity.config.js, which builds one `structureTool()` per entry in
// ARCHIVE_SECTIONS), and this file exports one resolver per section.
//
// Every resolver below returns `S.documentTypeList(schemaType)` directly
// as its root -- no wrapping menu pane. This is Sanity's own documented,
// canonical pattern for "a Structure Tool scoped to one document type"
// (their own published example is literally
// `structureTool({..., structure: (S) => S.documentTypeList('car')})`),
// not a workaround. Two things fall out of it for free: landing on any of
// these four tools shows real, browsable content immediately -- there's
// no chooser pane to land on first -- and every one of these four tools
// now has a maximum pane depth of two (this list, then a document)
// instead of three, so Sanity's default pane-collapse behavior never has
// a reason to trigger again. What makes these four read as one "Archive"
// to Josh is the persistent rail (UrbanumArchiveNav.jsx) and its layout
// override (UrbanumArchiveLayout.jsx), not anything in this file --
// Structure Builder itself still only knows about four separate tools.
//
// Same document editor/schema/validation/permissions Studio already
// provides for every type below -- this only changes how each type's own
// list is reached, never what's in it.
// Archive polish pass ("Archive list usability"): applies each section's
// own `defaultOrdering` (archiveSections.js) via `.defaultOrdering()`, the
// same public `DocumentListBuilder` method `documentTypeList()` already
// returns -- confirmed against the installed sanity@6.7.0 source before
// using it. Every other fact about a section (title, schema type) already
// flowed through this same lookup; ordering is just one more.
function sectionStructure(S, sectionName) {
  const section = ARCHIVE_SECTIONS.find((entry) => entry.name === sectionName)
  return S.documentTypeList(section.schemaType).title(section.title).defaultOrdering(section.defaultOrdering)
}

export const archiveItemsStructure = (S) => sectionStructure(S, 'archiveItems')
export const projectsStructure = (S) => sectionStructure(S, 'projects')
export const themesStructure = (S) => sectionStructure(S, 'themes')
export const photoJournalStructure = (S) => sectionStructure(S, 'photoJournal')

// About Page (About Page CMS milestone; re-homed under Journal in the
// CMS-completion pass): a singleton, not a browsable list like the other
// entries in ARCHIVE_SECTIONS, so it still gets its own resolver here
// rather than going through `sectionStructure`'s `S.documentTypeList(...)`
// -- there's exactly one About Page document, never a list of them.
// `S.document().schemaType(...).documentId(...)` is Sanity's own
// documented pattern for a singleton: it skips the list pane entirely and
// opens straight into one fixed document's editor, and that document does
// NOT need to be created/initialized ahead of time -- Sanity creates the
// draft the moment Josh edits a field, the same as any other document,
// just always addressed by this one fixed `documentId` instead of a
// generated one. `aboutPage` IS now a regular ARCHIVE_SECTIONS entry
// (`group: 'Journal'`, see archiveSections.js) so it gets a real Structure
// Tool via sanity.config.js's generic `ARCHIVE_SECTIONS.map(...)` --
// wired up via STRUCTURE_BY_SECTION_NAME the same way as every other
// section, this resolver is just the one that isn't `sectionStructure`.
export const aboutPageStructure = (S) =>
  S.document().schemaType('aboutPage').documentId('aboutPage')

// Contact Page (Contact drawer -> Contact page milestone): the exact same
// singleton pattern as aboutPageStructure directly above -- one fixed
// document, addressed by its own fixed `documentId` rather than a
// generated one, opened straight into its editor with no list pane. See
// aboutPageStructure's own comment for the full reasoning; nothing about
// it differs here beyond the schema type and document id.
export const contactPageStructure = (S) =>
  S.document().schemaType('contactPage').documentId('contactPage')
