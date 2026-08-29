import {defineField, defineType} from 'sanity'

// Project is the architectural project/build that groups Archive Items
// together -- it is not an individual image. Fields: Title, Slug,
// Sort Order, Type, Location, Year, Description, and nothing else (no
// color, no hero image, no relationship arrays). Archive Items already
// point here via their `project` reference; the frontend is responsible
// for querying that relationship in the other direction, so Project
// never maintains its own array of Archive Items.
//
// Sort Order is the one approved exception to the otherwise-locked
// schema: the frontend's Previous/Next Project navigation
// (projectContent.js's getProjectsInOrder) already depends on a
// CMS-defined Project.sortOrder and explicitly never falls back to
// alphabetical or creation-date order. This field restores compatibility
// with that existing, working behavior -- it is not a new feature.
//
// Type is the second approved exception: a new, mandatory Filter category
// (see below) requested directly, alongside Theme/Project/Year. It was
// first built as a plain closed-list string, then a reference to a
// document that was briefly (and incorrectly) named `type` -- see the CMS
// authoring pass note on its field below for both changes and why. This
// field's own name is now `projectType` (the schema/internal identifier);
// its Studio label stays exactly `Type` (the user-facing name) -- what's
// added to this schema is unchanged, only what kind of value the field
// holds and what it's internally called.
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
      // Type CMS authoring pass: was a closed `options.list` string
      // (Residential/Urban/Commercial only, no way to add a fourth
      // without editing this file). That worked for frontend filtering,
      // but the uploader's Required step needed to let Josh both select
      // an existing Type AND create a new one from the uploader, the
      // same way he already can for Theme -- and Sanity's `options.list`
      // has no "create new option" affordance at all; it's a fixed
      // dropdown baked into schema code. A reference to a real document
      // (typeType.js), the same shape Theme already uses on Archive Item,
      // is what makes that possible: the uploader can
      // `client.create({_type: 'projectType', title})` a new one exactly
      // like handleCreateTheme already does. Single reference (not an
      // array) since a Project has exactly one Type -- the same
      // cardinality the closed list already had, just represented as a
      // reference instead of a string now. Still mandatory
      // (`Rule.required()`); still written by the uploader
      // (ImportWorkspace.jsx) at the same moment Location/Year get set
      // for a brand-new Project, never touching an already-published
      // Project's existing Type.
      //
      // Naming correction: this field, the document it references
      // (typeType.js), and this field's own name were all originally
      // `type` -- Sanity rejects `type` as a *document* schema name
      // outright ("reserved name"), which is what actually broke Studio
      // and prompted this fix. This field name itself was never the
      // cause of that error (Sanity doesn't reserve `type` as a plain
      // field key), but it's renamed anyway, to `projectType`, for the
      // internal-consistency Josh asked for: one clear internal name
      // (`projectType`, used for the field, the reference target, and
      // GROQ) paired with one stable user-facing label (`Type`, below --
      // unchanged from before this fix and unrelated to it).
      name: 'projectType',
      title: 'Type',
      description: 'The category of project.',
      type: 'reference',
      to: [{type: 'projectType'}],
      validation: (Rule) => Rule.required(),
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
      // CMS typography foundation pass: additive sibling to `description`
      // below, same pattern as aboutPageType.js/contactPageType.js's own
      // `bodyRichText` fields -- see aboutPageType.js's comment for the
      // full non-destructive-migration rationale. src/ProjectInfoPanel.jsx
      // prefers this field when it has content, falling back to
      // `description` (and then `image.caption`, unchanged) otherwise.
      name: 'descriptionRichText',
      title: 'Description (optional)',
      description:
        'The project’s body copy on its detail page. Use Bold / Medium / Italic and Links inline as needed. Start a new paragraph for a line break. If this is left empty, the legacy Description (plain text) field below is used instead.',
      type: 'richText',
    }),
    defineField({
      name: 'description',
      title: 'Description (legacy plain text, optional)',
      description:
        'Superseded by the Description field above. Only used as a fallback when that field is empty.',
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
