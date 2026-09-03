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
      description: 'Lower numbers appear first.',
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
      // like handleCreateTheme already does.
      //
      // CMS Type Multi-Select pass: a Project can now belong to one or
      // more Types (e.g. both "Adaptive Reuse" and "Interiors"), not
      // exactly one -- this field is renamed `projectTypes` and changed
      // from a single `reference` to an `array` of references, the exact
      // same shape Archive Item's own `themes` (Lexicon) field already
      // uses on archiveItemType.js, referencing the same `projectType`
      // taxonomy document (typeType.js) this field always pointed at.
      // Still mandatory, `min(1)` rather than a bare `required()` --
      // "one or more," the same "at least one" contract `themes` already
      // enforces -- and still written by the uploader (ImportWorkspace.jsx)
      // at the same moments the old single field was, never touching an
      // already-published Project's Type(s) except to add to or change
      // them (see ImportWorkspace.jsx's own comment on that write for the
      // full reasoning).
      //
      // MIGRATION: this is a NEW field, not the old `projectType`
      // field renamed in place -- an existing Project's data lives under
      // the OLD field name (see the deprecated field immediately below)
      // until migrateProjectTypeToArray.js moves it over. Naming
      // correction: this field, the document it references (typeType.js),
      // and this field's own name were all originally `type` -- Sanity
      // rejects `type` as a *document* schema name outright ("reserved
      // name"), which is what actually broke Studio and prompted that
      // earlier fix; renamed then to `projectType`, and now to
      // `projectTypes` for this pass, for the same internal-consistency
      // reasoning each time. GROQ/frontend/importer all read/write this
      // exact field name now (see cms/components/ImportWorkspace.jsx,
      // src/cms/queries.js).
      name: 'projectTypes',
      title: 'Type',
      description: 'One or more categories for this project.',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'projectType'}]}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      // CMS Type Multi-Select pass -- DEPRECATED, COMPATIBILITY ONLY.
      // This is the OLD single-reference Type field this schema used
      // before this pass; `projectTypes` immediately above is now the
      // one Type field Josh sees and edits. This field is kept in the
      // schema (not deleted) purely so an existing Project's already-
      // stored `projectType` value stays a recognized, valid property --
      // removing this field definition entirely while old documents
      // still carry the old property would make Studio start showing
      // "Unknown field found" for every one of them, the exact same
      // class of problem the CMS Polish Pass's `tags` cleanup already
      // dealt with once (see cms/auditUnknownFields.js's own comment).
      // `hidden: true` keeps it out of the visible form entirely (Josh
      // never sees two Type-looking fields at once, satisfying "no
      // duplicate fields with conflicting meaning" -- there is exactly
      // one Type control visible and editable, `projectTypes` above);
      // `readOnly: true` additionally blocks any write through Studio's
      // own form even if something did surface it. No validation --
      // an unmigrated legacy Project has a value here and a brand-new
      // Project never will, and neither state should ever block
      // publishing.
      //
      // Once migrateProjectTypeToArray.js has been run against
      // production and every Project's data confirmed moved into
      // `projectTypes`, this field can be deleted from the schema
      // entirely in a later pass -- not done here, since that's a
      // one-way step this pass was explicitly told not to take yet.
      name: 'projectType',
      title: 'Type (legacy, hidden)',
      type: 'reference',
      to: [{type: 'projectType'}],
      hidden: true,
      readOnly: true,
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
      //
      // CMS Legacy Description Migration + Editor Cleanup pass: this is
      // now the ONE Description field Josh sees and edits -- `description`
      // below is hidden (not deleted; see its own comment). Title
      // simplified from "Description (optional)" to plain "Description"
      // and the description text shortened to just note it's optional,
      // now that there's no second Description-labeled field on screen
      // to disambiguate from or explain a fallback relationship to.
      name: 'descriptionRichText',
      title: 'Description',
      description: 'Optional.',
      type: 'richText',
    }),
    defineField({
      // CMS Legacy Description Migration + Editor Cleanup pass --
      // DEPRECATED, COMPATIBILITY ONLY. This is the OLD plain-text
      // Description field; `descriptionRichText` immediately above is
      // now the one Description field Josh sees and edits. Kept in the
      // schema (not deleted) so an existing Project's already-stored
      // `description` value stays a recognized, valid property rather
      // than triggering Studio's "Unknown field found" warning -- the
      // same reasoning the CMS Type Multi-Select pass already applied to
      // Project's own old `projectType` field (see that field's comment,
      // below). `hidden: true` keeps it out of the visible form entirely
      // (exactly one Description control is ever shown); `readOnly: true`
      // additionally blocks any write through Studio's own form even if
      // something did surface it.
      //
      // migrateLegacyDescriptionsToRichText.js copies this field's value
      // into descriptionRichText wherever that field is still empty --
      // this field's own stored value is never touched, cleared, or
      // unset by that script. Once migration is verified against
      // production, a later pass can delete this field from the schema
      // entirely -- not done here, on purpose, per this pass's own
      // instruction to keep it for compatibility/rollback until then.
      name: 'description',
      title: 'Description (legacy plain text)',
      type: 'text',
      rows: 3,
      hidden: true,
      readOnly: true,
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
