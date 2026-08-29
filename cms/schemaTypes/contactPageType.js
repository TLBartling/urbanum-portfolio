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
      title: 'Title (legacy/fallback)',
      description:
        'Legacy/fallback heading -- e.g. the studio name -- shown only when the Description field below has no rich-text content. If Description is populated, author "Urbānum" (and the rest of the visible text) there instead and this field is not shown. No longer required -- safe to leave blank once Description is in use.',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle (legacy/fallback)',
      description:
        'Legacy/fallback line beneath the title -- e.g. an address or a one-line descriptor. Only shown when the Description field below has no rich-text content.',
      type: 'string',
    }),
    defineField({
      name: 'bodyRichText',
      title: 'Description',
      description:
        'The page’s complete visible left-column text, including "Urbānum" and "Office For Architecture" themselves -- when this has content, it fully replaces the Title/Subtitle fields below (they will not be shown). Use Section Heading for "Urbānum"; use Normal for "Office For Architecture," the address, employment copy, and owner-representation copy; use Bold / Medium / Italic and Links inline as needed (e.g. a clickable email address). Start a new paragraph for a line break. If this is left empty, the legacy Title / Subtitle / Description (plain text) fields below are used instead.',
      type: 'richText',
    }),
    defineField({
      name: 'body',
      // CMS typography foundation pass: demoted to legacy fallback -- see
      // aboutPageType.js's own `body` field comment for the identical
      // pattern and rationale.
      title: 'Description (legacy plain text)',
      description:
        'Superseded by the Description field above. Only used as a fallback when that field is empty -- existing paragraphs here still render exactly as before, one per blank-line-separated block.',
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
