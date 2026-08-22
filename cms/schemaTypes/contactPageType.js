import {defineField, defineType} from 'sanity'

// Contact Page is a singleton document -- there is exactly one of these,
// ever, editing the site's `/contact` page. Mirrors aboutPageType.js
// exactly (same three fields, same singleton pattern, same reasoning for
// why `body` is plain `text` rather than Portable Text -- see that
// file's own comment for the full rationale, unchanged here). Reached in
// Studio via its own tool (see structure.js's `contactPageStructure`,
// wired in via sanity.config.js), which opens straight into this one
// document's editor rather than a list, exactly like About Page.
//
// Contact Page redesign (Contact drawer -> Contact page milestone):
// replaces the old Header Contact drawer (a hardcoded ["Instagram",
// "Email", "Phone"] list, MENU_CONTACT_ITEMS in Header.jsx, now removed)
// with a real, CMS-driven page. No new field shape was introduced for
// this -- the reference composition (a name/address block, then a few
// short paragraphs, each ending in an email address) reads perfectly
// well as Title + Subtitle + a multi-paragraph Body, the exact same
// three fields About Page already uses, so this schema reuses that
// structure rather than inventing Contact-specific fields. Whatever
// Josh needs to say (address, phone, submission guidelines, multiple
// contact emails) is just more paragraphs in Body, separated by a blank
// line each, same convention as About.
export const contactPageType = defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      description: 'The Contact page’s heading -- e.g. the studio name.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      description: 'A short line beneath the title -- e.g. an address or a one-line descriptor.',
      type: 'string',
    }),
    defineField({
      name: 'body',
      title: 'Description',
      description:
        'The page’s main content -- address, phone, submission guidelines, contact emails, and so on. Leave a blank line between paragraphs -- each becomes its own paragraph on the site.',
      type: 'text',
      rows: 12,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'subtitle'},
    prepare({title, subtitle}) {
      return {
        title: title || 'Contact Page',
        subtitle,
      }
    },
  },
})
