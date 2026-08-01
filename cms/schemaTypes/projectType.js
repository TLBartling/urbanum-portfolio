import {defineField, defineType} from 'sanity'

// Project is the architectural project/build that groups Archive Items
// together -- it is not an individual image. Fields: Title, Slug,
// Sort Order, Location, Year, Description, and nothing else (no color,
// no hero image, no relationship arrays). Archive Items already point
// here via their `project` reference; the frontend is responsible for
// querying that relationship in the other direction, so Project never
// maintains its own array of Archive Items.
//
// Sort Order is the one approved exception to the otherwise-locked
// schema: the frontend's Previous/Next Project navigation
// (projectContent.js's getProjectsInOrder) already depends on a
// CMS-defined Project.sortOrder and explicitly never falls back to
// alphabetical or creation-date order. This field restores compatibility
// with that existing, working behavior -- it is not a new feature.
export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          if (!slug?.current) return true

          const {document, getClient} = context
          const client = getClient({apiVersion: '2024-01-01'})
          const id = document._id.replace(/^drafts\./, '')

          const existingId = await client.fetch(
            `*[_type == "project" && slug.current == $slug && !(_id in [$draftId, $publishedId])][0]._id`,
            {slug: slug.current, draftId: `drafts.${id}`, publishedId: id},
          )

          return existingId ? 'This slug is already used by another Project.' : true
        }),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      description: 'Controls Previous/Next Project navigation order. Lower numbers appear first.',
      type: 'number',
      validation: (Rule) => Rule.required().integer(),
    }),
    defineField({
      // Archive polish pass ("optional-field labeling"): Studio has no
      // built-in required-field marker of its own (confirmed against the
      // installed source -- see archiveItemType.js's own Sort Order
      // comment for the full reasoning). Location/Year/Description are
      // all optional here, same as Archive Item's own equivalents, so
      // they now carry the same "(optional)" signal.
      name: 'location',
      title: 'Location (optional)',
      type: 'string',
    }),
    defineField({
      name: 'year',
      title: 'Year (optional)',
      type: 'number',
      validation: (Rule) => Rule.integer().min(1800).max(2100),
    }),
    defineField({
      name: 'description',
      title: 'Description (optional)',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {title: 'title'},
    // Fallback only -- the underlying `title` field, its requiredness,
    // and validation are all unchanged. Without `prepare()`, Studio's
    // default preview shows the bare word "Untitled" for a brand-new
    // Project in the list pane, the pane header, and any reference
    // picker, all at once, before Josh has typed anything. This swaps
    // that generic placeholder for one that says what's actually being
    // created; it doesn't hide or delay the label.
    prepare({title}) {
      return {title: title || 'New Project'}
    },
  },
})
