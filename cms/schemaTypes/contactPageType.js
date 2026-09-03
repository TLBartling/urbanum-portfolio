import {defineField, defineType} from 'sanity'

// Contact Page is a singleton document -- there is exactly one of these,
// ever, editing the site's `/contact` page. Mirrors aboutPageType.js
// exactly (same field set, same singleton pattern, same reasoning for why
// `body` is a legacy plain `text` fallback beside a new Portable Text
// field -- see that file's own comment for the full rationale, unchanged
// here). Reached in Studio via its own tool (see structure.js's
// `contactPageStructure`, wired in via sanity.config.js), which opens
// straight into this one document's editor rather than a list, exactly
// like About Page.
//
// Contact Page redesign (Contact drawer -> Contact page milestone):
// replaces the old Header Contact drawer (a hardcoded ["Instagram",
// "Email", "Phone"] list, MENU_CONTACT_ITEMS in Header.jsx, now removed)
// with a real, CMS-driven page. No new field shape was introduced for
// this -- the reference composition (a name/address block, then a few
// short paragraphs, each ending in an email address) reads perfectly
// well as Title + Subtitle + a multi-paragraph Body, the exact same
// fields About Page already uses, so this schema reuses that structure
// rather than inventing Contact-specific fields.
//
// CMS typography foundation pass: this composition -- "an address block,
// then a few short paragraphs, each ending in an email address" -- is
// exactly why richTextLinkType.js's own comment names `mailto:` as a
// real, foreseeable use for Contact specifically: Josh can now make each
// address an actual clickable link from Sanity, in Bold if that's the
// visual treatment a page-visual-matching pass later calls for, rather
// than plain unlinked text.
//
// Authoring-architecture pass: `title`/`subtitle` are demoted the same
// way aboutPageType.js's own fields already were -- kept, renamed only in
// their Studio `title`/`description` text (not their `name`, not their
// `type`), and no longer `Rule.required()`. src/ContactPage.jsx now
// renders them only when `bodyRichText` is empty, so a document with real
// Description content doesn't show "Urbānum" twice (once as this plain
// field, once inside the rich text). A Contact Page that keeps using
// Title/Subtitle/Description(legacy) exactly as before still renders
// identically; this only removes the requirement that blocked leaving
// Title blank once the rich-text field is doing that job instead.
export const contactPageType = defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      description: 'Shown only if Description below is empty.',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      description: 'Shown only if Description below is empty.',
      type: 'string',
    }),
    defineField({
      // CMS Legacy Description Migration + Editor Cleanup pass:
      // description text simplified -- see aboutPageType.js's own
      // identical field comment for the full reasoning (same pattern,
      // same rationale, applied here).
      name: 'bodyRichText',
      title: 'Description',
      description: 'Optional.',
      type: 'richText',
    }),
    defineField({
      // CMS Legacy Description Migration + Editor Cleanup pass --
      // DEPRECATED, COMPATIBILITY ONLY. See aboutPageType.js's own
      // `body` field comment for the identical pattern and rationale.
      name: 'body',
      title: 'Description (legacy plain text)',
      type: 'text',
      rows: 12,
      hidden: true,
      readOnly: true,
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
