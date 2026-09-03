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
      title: 'Title',
      description: 'Shown only if Description below is empty.',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle / Location',
      description: 'Shown only if Description below is empty.',
      type: 'string',
    }),
    defineField({
      // CMS Legacy Description Migration + Editor Cleanup pass:
      // description text simplified -- still tells Josh the one thing he
      // needs to act on (this replaces Title/Subtitle on the page once
      // it has content) and how to format it, in plain language, without
      // the internal "legacy/fallback field" wiring explanation that used
      // to accompany it.
      name: 'bodyRichText',
      title: 'Description',
      description: 'Optional.',
      type: 'richText',
    }),
    defineField({
      // CMS Legacy Description Migration + Editor Cleanup pass --
      // DEPRECATED, COMPATIBILITY ONLY. This is the OLD plain-text Body
      // field; `bodyRichText` immediately above is now the one
      // Description field Josh sees and edits. Kept in the schema (not
      // deleted) so an existing About Page document's already-stored
      // `body` value stays a recognized, valid property rather than
      // triggering "Unknown field found" -- same reasoning as
      // projectType.js's own now-hidden `description` field. `hidden:
      // true` keeps it out of the visible form entirely; `readOnly: true`
      // additionally blocks any write through Studio's own form.
      //
      // migrateLegacyDescriptionsToRichText.js copies this field's value
      // into bodyRichText wherever that field is still empty -- this
      // field's own stored value is never touched, cleared, or unset by
      // that script.
      name: 'body',
      title: 'Description (legacy plain text)',
      type: 'text',
      rows: 8,
      hidden: true,
      readOnly: true,
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
