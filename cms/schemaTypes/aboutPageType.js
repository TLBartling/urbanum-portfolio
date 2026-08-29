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
// Body was a plain multi-line `text` field, not Portable Text -- checked
// first: this project had no Portable Text/rich-text infrastructure
// anywhere yet (no `block`-type field in any existing schema, no
// @portabletext/react in the frontend's dependencies), and every existing
// body-copy field in this project (Archive Item's/Project's own
// `description`) was already a plain `text` field. Portable Text was
// flagged here as "a reasonable later upgrade if real rich formatting
// (bold, links, lists) is ever needed" -- that upgrade is this pass.
//
// CMS typography foundation pass: `body` (below) is now the LEGACY
// fallback field, kept exactly as it was -- untouched type, untouched
// name, untouched validation -- and a NEW sibling field, `bodyRichText`,
// is added alongside it, using the shared `richText` type
// (richTextType.js). This is additive, not a type change: no existing
// About Page document's stored `body` value is touched, moved, or
// reinterpreted. src/AboutPage.jsx now prefers `bodyRichText` when it has
// content and falls back to rendering `body` exactly as before when it
// doesn't -- so an About Page that was never re-edited in Studio keeps
// rendering identically, while Josh gains real Bold/Medium/Italic/Link/
// Section-Heading control going forward by simply using the new field.
//
// Authoring-architecture pass: `title`/`subtitle` are demoted the same
// way `body` already was -- kept, renamed only in their Studio `title`/
// `description` text (not their `name`, not their `type`), and no longer
// `Rule.required()`. src/AboutPage.jsx now renders them only when
// `bodyRichText` is empty, so a document with real Description content
// no longer shows "Practice" twice (once as this plain field, once
// inside the rich text). Nothing here forces Josh to move "Practice"
// into Description -- an About Page that keeps using Title/Subtitle/
// Description(legacy) exactly as before still renders identically; this
// only removes the requirement that blocked leaving Title blank once the
// rich-text field is doing that job instead.
export const aboutPageType = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title (legacy/fallback)',
      description:
        'Legacy/fallback heading, shown at the top of the left column only when the Description field below has no rich-text content. If Description is populated, author "Practice" (and the rest of the visible text) there instead and this field is not shown. No longer required -- safe to leave blank once Description is in use.',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle / Location (legacy/fallback)',
      description:
        'Legacy/fallback line beneath the title -- e.g. a location or a one-line descriptor. Only shown when the Description field below has no rich-text content.',
      type: 'string',
    }),
    defineField({
      name: 'bodyRichText',
      title: 'Description',
      description:
        'The page’s complete visible text, including "Practice" itself and "Philosophy" -- when this has content, it fully replaces the Title/Subtitle fields below (they will not be shown). Use Section Heading for "Practice" and for a sub-heading like "Philosophy"; use Normal for intro copy and short statements; use Bold / Medium / Italic and Links inline as needed. Start a new paragraph for a line break. If this is left empty, the legacy Title / Subtitle / Description (plain text) fields below are used instead.',
      type: 'richText',
    }),
    defineField({
      name: 'body',
      // CMS typography foundation pass: demoted to legacy fallback --
      // still the exact same `text` field (name, type, rows all
      // unchanged), so any existing About Page document's stored value
      // keeps rendering exactly as it does today. Only the Studio title/
      // description below changed, to make its now-secondary role clear
      // to Josh. src/cms/queries.js still fetches this field under its
      // original name; src/AboutPage.jsx now reads it only when
      // `bodyRichText` is empty.
      title: 'Description (legacy plain text)',
      description:
        'Superseded by the Description field above. Only used as a fallback when that field is empty -- existing paragraphs here still render exactly as before, one per blank-line-separated block.',
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
