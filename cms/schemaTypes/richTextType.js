import {defineArrayMember, defineType} from 'sanity'

// CMS typography foundation pass: the one shared, reusable Portable Text
// block-array type this whole pass introduces. Every field that upgrades
// from a plain text/textarea field to real rich text (aboutPage.body,
// contactPage.body, project.description -- see each schema file's own
// comment on why it's added as a NEW sibling field, not a destructive type
// change) references this exact type, rather than each page inventing its
// own block config. Per the task brief: "the smallest sensible shared
// rich-text definition that can be reused across the relevant pages
// without over-abstracting."
//
// Deliberately constrained -- this is NOT a generic WYSIWYG:
//
// - styles: exactly two. 'Normal' (Sanity's own default block style,
//   value 'normal') covers every existing paragraph on every page today.
//   'Section Heading' (value 'h2') is the one addition, justified
//   specifically by the Practice mockup's "Philosophy" second-level
//   heading sitting inline within otherwise-flowing body copy -- a real,
//   supplied-mockup requirement, not a speculative addition. No H1/H3-H6:
//   each page's own page title is already a separate plain `title` string
//   field outside this rich-text field entirely (see aboutPageType.js/
//   contactPageType.js), so H1 has no role inside the body copy itself,
//   and nothing in any supplied mockup needs a third heading level.
//
// - decorators (inline marks): Bold ('strong'), Medium (a custom decorator
//   -- Sanity has no built-in mid-weight mark, this is exactly the "custom
//   decorators" option the task brief itself names as acceptable), Italic
//   ('em'), and Muted (a second custom decorator -- see its own note
//   below). No underline, no strikethrough, no code, no free-form colors
//   -- none of those appear in any supplied mockup or are named in the
//   brief's own allowed list.
//
// - Muted (Contact visual-fidelity pass): added specifically for the
//   Contact mockup's "Office For Architecture" line -- a real, supplied-
//   mockup requirement, not a speculative addition. Audited first:
//   Normal/Section Heading/Bold/Medium/Italic/Link cannot reproduce it.
//   Section Heading gives the right size register (it sits directly under
//   "Urbānum," itself a Section Heading, and reads at the same size in
//   the mockup), but every one of the three existing decorators only ever
//   changes weight or slant -- none of them can touch color, and the
//   mockup's muted-gray IS the whole distinguishing feature versus plain
//   body copy. This is a single FIXED, named semantic style -- "de-
//   emphasized secondary text, e.g. a subtitle line directly beneath a
//   heading" -- not an open color picker: Josh picks "Muted" the same way
//   he picks "Bold," there is no color value to choose. Deliberately
//   narrow in scope (one fixed color, reusing the exact #9d9d9d already
//   used for .about-hero__location/muted nav labels elsewhere on this
//   site, not a new value) -- explicitly NOT the "arbitrary color
//   control" this project's brief has repeatedly prohibited.
//
// - annotations: exactly one, the `link` object type richTextLinkType.js
//   defines (a single required URL field, scheme-restricted). No other
//   annotation type exists or is referenced here.
//
// - lists: explicitly disabled (empty array). Sanity's list UI would add
//   its own bullet/number affordance and indentation model; nothing
//   supplied (Project's metadata/awards rows, in particular) reads as a
//   Sanity list in the mockups -- each is "a few short one-line
//   paragraphs," which the existing 'Normal' style + this array's own
//   multi-block nature already supports without a dedicated list feature.
//   If a real bulleted list is needed later, this is the one place to add
//   it -- see the top-level comment on this being the shared, reusable
//   definition.
//
// - No arbitrary font-size, numeric font-weight, alignment, or spacing
//   controls of any kind, and no HTML-editing affordance -- all
//   explicitly prohibited by the brief, and none added here. Muted above
//   is the one exception to "no custom colors," justified on its own
//   terms immediately above -- everything else in that sentence still
//   holds.
export const richTextType = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Section Heading', value: 'h2'},
      ],
      lists: [],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Medium', value: 'medium'},
          {title: 'Italic', value: 'em'},
          {title: 'Muted', value: 'muted'},
        ],
        annotations: [{type: 'link'}],
      },
    }),
  ],
})
