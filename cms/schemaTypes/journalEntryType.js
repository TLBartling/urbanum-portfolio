import {defineField, defineType} from 'sanity'

// Journal Entry is a photo journal, not a written journal: each entry is
// one photograph and one moment. Deliberately flat and standalone -- no
// references to Project, Theme, or Archive Item, and no rich text/
// Portable Text body. Caption is plain short text, included only as
// future-proof metadata; nothing on the current site renders it yet.
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
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      description:
        'Short plain text only. Not currently displayed anywhere on the site — kept as future-proof metadata.',
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
  preview: {
    select: {title: 'title'},
  },
})
