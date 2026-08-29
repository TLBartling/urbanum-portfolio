import {defineField, defineType} from 'sanity'

// CMS typography foundation pass: the one annotation type richTextType.js's
// shared block config registers -- a plain external link, nothing more.
// Kept deliberately minimal: a single required URL field, restricted to
// the schemes an editorial link on this site would actually need (http/
// https for external references, mailto/tel since Contact's own body copy
// already reads as "an address block, then a few short paragraphs, each
// ending in an email address" -- see contactPageType.js's own comment --
// so a Sanity-editable `mailto:` link is a real, foreseeable use, not a
// hypothetical one). No "open in new tab" toggle, no title/rel/class
// fields -- nothing here that isn't "a URL, editable in Sanity," per this
// pass's own instruction not to introduce arbitrary styling controls.
export const richTextLinkType = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'href',
      title: 'URL',
      description: 'Where this link goes. Supports web addresses, and email/phone links (e.g. mailto:name@example.com, tel:+13052091587).',
      type: 'url',
      validation: (Rule) =>
        Rule.required().uri({scheme: ['http', 'https', 'mailto', 'tel']}),
    }),
  ],
})
