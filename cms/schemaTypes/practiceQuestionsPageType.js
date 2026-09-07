import {defineField, defineType} from 'sanity'

// Surgical CMS pass (Practice Questions -> Sanity): a singleton document,
// same pattern as contactPageType.js/aboutPageType.js -- exactly one of
// these, editing the /practice/questions page's Q&A list.
//
// Simplification pass: replaced the earlier "array of {question, answer}
// objects" model with 9 pairs of plain top-level fields (question1/
// answer1 .. question9/answer9). Two concrete reasons:
//   1. Editor UX -- Josh asked for plain text fields instead of the
//      array's document-style cards; there's no reorder requirement, so a
//      reorderable array was more editor than this content ever needed.
//   2. This also removes the one real schema difference between this
//      singleton and the working About Page / Contact Page ones: an
//      array whose `of` member was declared with `defineField` (fields-
//      array helper) instead of `defineArrayMember` (the correct helper
//      for `of` entries), plus a document-level `initialValue` seeding
//      that array -- either of those could plausibly be what triggered
//      Sanity's create/template-resolution path instead of loading the
//      fixed document directly, producing the reported SerializeError.
//      Flat string/text fields have neither an `of` array-member type
//      nor an `initialValue` to resolve, so both suspects are gone
//      regardless of which one was the actual cause.
//
// Order is simply field declaration order below (question1/answer1 first,
// question9/answer9 last) -- src/cms/queries.js's normalizer reads them
// in this exact order to reconstruct the same 9-item list the frontend
// already renders. No drag-and-drop ordering needed.
//
// Routing, metadata, canonical URL, and JSON-LD for this page stay
// code-owned (src/PracticeQuestionsPage.jsx / scripts/seo/routes.mjs) --
// nothing here touches any of that.
export const practiceQuestionsPageType = defineType({
  name: 'practiceQuestionsPage',
  title: 'Q&A Page',
  type: 'document',
  fields: [
    defineField({
      name: 'question1',
      title: 'Question 1',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer1',
      title: 'Answer 1',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question2',
      title: 'Question 2',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer2',
      title: 'Answer 2',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question3',
      title: 'Question 3',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer3',
      title: 'Answer 3',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question4',
      title: 'Question 4',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer4',
      title: 'Answer 4',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question5',
      title: 'Question 5',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer5',
      title: 'Answer 5',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question6',
      title: 'Question 6',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer6',
      title: 'Answer 6',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question7',
      title: 'Question 7',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer7',
      title: 'Answer 7',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question8',
      title: 'Question 8',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer8',
      title: 'Answer 8',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question9',
      title: 'Question 9',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer9',
      title: 'Answer 9',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Q&A Page'}
    },
  },
})
