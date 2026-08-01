import {defineField, defineType} from 'sanity'

// Minimal placeholder only -- see projectType.js for the same rationale.
// Theme is a controlled entity that Archive Item references today, so
// its "Themes" field (multi-select + inline "Create new theme") works
// immediately. The full Theme schema is a separate, later task.
export const themeType = defineType({
  name: 'theme',
  title: 'Theme',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title'},
    // Same reasoning as projectType.js's prepare(): only replaces the
    // generic "Untitled" placeholder text with something that names what
    // it is. Nothing about the `title` field itself changes.
    prepare({title}) {
      return {title: title || 'New Theme'}
    },
  },
})
