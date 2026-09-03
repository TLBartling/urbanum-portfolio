import {defineField, defineType} from 'sanity'
import {ArchiveNumberInput} from './components/ArchiveNumberInput'
import {TypeContextField} from './components/TypeContextField'

// Archive Item is the atomic unit of the Urbanum archive: one photograph
// plus the minimum structured metadata needed to place it -- which
// Project it belongs to, which Themes it speaks to, and where it falls in
// curated ordering. Everything past that is optional context Josh can add
// if and when he has it.
//
// Field order below is intentional and mirrors the editing flow: the
// image comes first ("Instagram for an architect" -- the photo is the
// primary act, not a supporting attachment), then the small set of
// required structure, then the Date fields, then optional metadata, then
// Private Notes last, since it's the field furthest from day-to-day
// archiving and closest to "only look at this if you need to."
export const archiveItemType = defineType({
  name: 'archiveItem',
  title: 'Archive Item',
  type: 'document',
  // Archive polish pass ("Sorting options"): a schema-level `orderings`
  // array is the documented, public way to add a real entry to Studio's
  // own Sort menu (confirmed against the installed sanity@6.7.0 source --
  // `getOrderingMenuItemsForSchemaType` reads this exact field and
  // concatenates it onto the stock Updated At/Created At options). Only
  // one entry, not two: the list's own `defaultOrdering`
  // (archiveSections.js) already opens sorted by Archive Number,
  // descending -- adding a second "descending" menu item would just
  // duplicate what's already on screen. Oldest First is the one new,
  // useful option this adds.
  orderings: [
    {
      title: 'Archive Number (Oldest First)',
      name: 'archiveNumberAsc',
      by: [{field: 'archiveNumber', direction: 'asc'}],
    },
  ],
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'archiveNumber',
      title: 'Archive Number',
      type: 'string',
      // CMS refinement (client-requested): this field is editable -- see
      // ArchiveNumberInput.jsx's own "EDITABLE OVERRIDE" comment. The
      // description here is updated to match; nothing else about the
      // field (its name, type, validation, or position in the form)
      // changed.
      description: 'Assigned automatically. Edit to override if needed.',
      components: {input: ArchiveNumberInput},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{type: 'project'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'themes',
      title: 'Lexicon',
      description: 'Ideas that connect this image to the rest of the archive.',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'theme'}]}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      // CMS Type Context pass: read-only display only -- resolves and
      // shows the linked Project's own Type(s) (`projectTypes`, an
      // array of references -- see projectType.js), it does not store
      // any of it. This field is never
      // patched by TypeContextField.jsx (it never calls `onChange`), so
      // this document's stored JSON never actually gains a `typeContext`
      // property no matter how long Josh looks at this screen -- there
      // is nothing here to become a second, out-of-sync copy of Type.
      // `readOnly: true` is set for the same reason ArchiveNumberInput's
      // own comment explains it must NOT be set on that field: here, the
      // opposite applies, since this field's component never calls
      // `set()` at all, `readOnly` only reinforces (never blocks) the
      // read-only intent already true by construction.
      name: 'typeContext',
      title: 'Type',
      type: 'string',
      readOnly: true,
      description: 'Type is managed on the linked Project.',
      components: {input: TypeContextField},
    }),
    defineField({
      name: 'displayRole',
      title: 'Display Role',
      // Archive polish pass ("wording"): rewritten from "Default = normal
      // archive image. Featured = ..." -- the "=" notation read as
      // technical shorthand, out of step with every other field
      // description in this schema, which is written as plain prose.
      // Meaning is unchanged, only the phrasing.
      //
      // Editorial-copy pass: shortened further to plain, editorial
      // language -- what each option means for the image, not a
      // definitions list. The three option values themselves (Default/
      // Featured/Hidden, in the options.list below) are unchanged.
      description: 'Controls where this image appears.',
      type: 'string',
      options: {
        list: [
          {title: 'Default', value: 'Default'},
          {title: 'Featured', value: 'Featured'},
          {title: 'Hidden', value: 'Hidden'},
        ],
      },
      initialValue: 'Default',
    }),
    defineField({
      name: 'sortOrder',
      // Archive polish pass ("optional-field labeling"): Studio has no
      // built-in required-field marker of its own (confirmed against the
      // installed source -- FormFieldHeaderText never renders one; the
      // only signal is a validation-error icon that appears after a
      // required field is left blank and Josh tries to publish). The
      // "(optional)" suffix already used on Exact Date/Title/Location/
      // Description below is Josh's only up-front signal that a field can
      // be skipped -- Sort Order didn't carry it despite being just as
      // optional, which is the inconsistency this labels.
      title: 'Sort Order (optional)',
      description: 'Lower numbers come first.',
      type: 'number',
      validation: (Rule) => Rule.integer(),
    }),
    defineField({
      name: 'year',
      // Same reasoning as Sort Order's own title comment, above.
      title: 'Year (optional)',
      description: 'Use if you only know the year this was taken.',
      type: 'number',
      validation: (Rule) => Rule.integer().min(1800).max(2100),
    }),
    defineField({
      name: 'fullDate',
      title: 'Exact Date (optional)',
      description: 'Use if you know the exact date this was taken.',
      type: 'date',
    }),
    defineField({
      name: 'title',
      title: 'Title (optional)',
      type: 'string',
    }),
    defineField({
      name: 'location',
      title: 'Location (optional)',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description (optional)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'privateNotes',
      title: 'Private Notes',
      description: 'Never shown on the public site.',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      archiveNumber: 'archiveNumber',
      projectTitle: 'project.title',
      year: 'year',
      media: 'image',
    },
    prepare({title, archiveNumber, projectTitle, year, media}) {
      const heading = title || projectTitle || 'Untitled'
      const subtitle = [archiveNumber, title ? projectTitle : null, year]
        .filter(Boolean)
        .join(' · ')

      return {
        title: heading,
        subtitle,
        media,
      }
    },
  },
})
