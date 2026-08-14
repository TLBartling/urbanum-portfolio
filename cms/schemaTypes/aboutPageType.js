import {defineField, defineType} from 'sanity'

// About Page is a singleton document -- there is exactly one of these,
// ever, editing the site's `/about` page. Reached in Studio via its own
// tool (see structure.js's `aboutPageStructure`, wired in via
// sanity.config.js), which opens straight into this one document's
// editor rather than a list -- the same documented Sanity pattern used
// for a project's "Settings" document elsewhere in the ecosystem, here
// applied to a single content page instead. No `slug`, no `sortOrder`,
// no relationship fields -- unlike Project/Archive Item, there's only
// ever one of these to find, so none of that machinery applies.
//
// Redesign pass (About Page CMS milestone): three fields, matching the
// new page's own two-column composition exactly -- Title and
// Subtitle/Location on the left above the body copy, Body beneath them.
// The image on the page's right side is deliberately NOT a field here --
// it reuses the existing Archive Item `displayRole: 'Featured'` concept
// instead (see src/AboutPage.jsx's own comment), so this document has no
// image field of its own to keep in sync with that.
//
// Body is a plain multi-line `text` field, not Portable Text -- checked
// first: this project has no Portable Text/rich-text infrastructure
// anywhere yet (no `block`-type field in any existing schema, no
// @portabletext/react in the frontend's dependencies), and every existing
// body-copy field in this project (Archive Item's/Project's own
// `description`) is already a plain `text` field. Matching that existing
// convention avoids introducing a new schema field type AND a new
// frontend rendering dependency for what's a few paragraphs of editorial
// copy -- Portable Text remains a reasonable later upgrade if real rich
// formatting (bold, links, lists) is ever needed, not something this
// pass rules out permanently.
export const aboutPageType = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      description: 'The About page’s heading. Shown at the top of the left column.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle / Location',
      description: 'A short line beneath the title -- e.g. a location or a one-line descriptor.',
      type: 'string',
    }),
    defineField({
      name: 'body',
      // Labeled "Description" in Studio (per the CMS-completion pass's own
      // spec) -- the underlying field name stays `body`, unchanged, so
      // src/cms/queries.js's GROQ projection and src/AboutPage.jsx's own
      // `aboutPage.body` read need no update; only what Josh sees as the
      // field's name in the editor changed.
      title: 'Description',
      description:
        'The page’s main body copy (left column, beneath the title). Leave a blank line between paragraphs -- each becomes its own paragraph on the site.',
      type: 'text',
      rows: 8,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'subtitle'},
    prepare({title, subtitle}) {
      return {
        title: title || 'About Page',
        subtitle,
      }
    },
  },
})
