import {defineField, defineType} from 'sanity'

// Journal Entry is a photo journal, not a written journal: each entry is
// one photograph and one moment. Deliberately flat and standalone -- no
// references to Project, Theme, or Archive Item, and no rich text/
// Portable Text body.
//
// Terminology pass ("Journal Entries" -> "Photo Journal"): `title`
// renamed to match -- Sanity uses this exact string for the document
// type badge in the editor pane, the "+ New" button, and search results,
// so leaving it as "Journal Entry" would have meant the collection reads
// as "Photo Journal" (structure.js's list label) while every document
// inside it still individually badges itself "Journal Entry." Singular
// "Photo Journal Entry" mirrors the same singular/plural split this
// project already uses for Archive Item (singular type) vs. Archive
// Items (structure.js's plural list label) -- not a new pattern. `name`
// (the `_type` value every query, draft ID, and the frontend already key
// off) is completely untouched.
//
// Journal Title Workflow removed: there is no public-facing Title field
// on this document type -- Josh decided the Journal shouldn't carry a
// public title at all. The Studio list still needs *some* label per
// entry so entries aren't indistinguishable "Untitled" rows; see
// `preview` below, which derives one from `date` (or `_createdAt` if no
// date is set yet) purely for that list display. This derived label is
// never stored as a field and never reaches the frontend -- it isn't
// selectable by any GROQ query, only by Sanity's own preview resolver.
export const journalEntryType = defineType({
  name: 'journalEntry',
  title: 'Photo Journal Entry',
  type: 'document',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
    }),
    defineField({
      name: 'caption',
      title: 'Image Caption',
      description:
        'Short plain text only. Shown as a subtle hover caption on the Journal page when present -- left blank, nothing is shown.',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'privateNotes',
      title: 'Private Notes',
      description: 'Internal use only — never displayed publicly on the site.',
      type: 'text',
      rows: 3,
    }),
  ],
  // Studio List Label (Journal Title Workflow removal): with no `title`
  // field left on this document, every entry would otherwise badge
  // itself "Untitled" in the Studio's document list -- purely a Studio
  // usability problem, not a content field. prepare() computes a
  // display-only label from `date` (falling back to the document's own
  // `_createdAt` system timestamp if no Date has been entered yet), so
  // Josh can tell entries apart at a glance. This is never persisted to
  // the document and never queryable from the frontend -- it only ever
  // exists inside Sanity Studio's own list/reference UI.
  preview: {
    select: {date: 'date', createdAt: '_createdAt'},
    prepare({date, createdAt}) {
      return {title: date || (createdAt ? createdAt.slice(0, 10) : 'Untitled')}
    },
  },
})
