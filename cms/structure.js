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
