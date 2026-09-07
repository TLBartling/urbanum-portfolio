import {defineField, defineType} from 'sanity'

// Surgical CMS pass (Site Information -> Sanity): singleton document,
// same pattern as contactPageType.js. Only the copy a visitor actually
// reads on /site-information is here -- routing, metadata, canonical
// URL, and JSON-LD stay code-owned (src/SiteInformationPage.jsx).
//
// Surgical correction: Fine Print was originally three split plain-string
// fields specifically so the "About the Practice" link's destination
// stayed code-owned. Per direct instruction, it's now ONE Portable Text
// field (finePrintRichText, below) using the project's existing shared
// rich-text/link pattern -- Josh can edit the whole sentence naturally
// and change the link's destination himself, the same way he already can
// on Contact's body copy. That link's destination is therefore no longer
// code-owned; see finePrintRichText's own comment.
export const siteInformationPageType = defineType({
  name: 'siteInformationPage',
  title: 'Site Information',
  type: 'document',
  fields: [
    defineField({
      name: 'accessibilityText',
      title: 'Accessibility',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'copyrightText',
      title: 'Copyright',
      type: 'text',
      rows: 4,
    }),
    defineField({
      // Surgical correction: replaces the three split
      // finePrintBeforeLink/finePrintLinkText/finePrintAfterLink string
      // fields with one Portable Text field -- same shared `richText`
      // type (and its one `link` annotation, richTextLinkType.js) every
      // other rich-text field in this project already uses, so Josh edits
      // this exactly like Contact's own body copy: select text, add/edit
      // an inline link, change its destination, all natively in Sanity.
      // richTextLinkType's own `href` validation only accepts absolute
      // http/https/mailto/tel URLs (shared, unchanged here) -- an
      // internal link should use the full https://urbanumarchitecture.org/...
      // address, not a bare "/path".
      name: 'finePrintRichText',
      title: 'Fine Print',
      type: 'richText',
    }),
  ],
  // Surgical correction: the document-level `initialValue` that used to
  // sit here has been removed -- practiceQuestionsPageType.js's own
  // schema comment explains why (a plausible trigger for Sanity's
  // create/template-resolution path instead of loading the fixed
  // document directly). Site Information's fields/content are otherwise
  // untouched; see cms/seedSingletonContent.js for how the exact current
  // copy is preserved without schema-level initialValue.
  preview: {
    prepare() {
      return {title: 'Site Information'}
    },
  },
})
