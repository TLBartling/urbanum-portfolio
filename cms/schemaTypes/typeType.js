import {defineField, defineType} from 'sanity'

// Type CMS authoring pass, naming correction: this document's own schema
// `name` was originally registered as the bare word `type` -- which Sanity
// rejects outright ("Invalid type name: 'type' is a reserved name"), since
// every document already carries an internal `_type` property and `type`
// itself is one of Sanity's own built-in field/type keywords. That surfaced
// the moment Studio actually tried to load this schema, which is exactly
// the uploader-behavior verification this pass's own instructions asked
// for -- the schema had never successfully loaded before this fix.
//
// Renamed to `projectType`: the internal/schema identifier Josh asked for
// specifically, distinct on purpose from the user-facing label. `name` is
// the machine identifier Sanity/Studio/GROQ use internally (document
// `_type`, reference `to` targets, query filters) and is never shown to
// Josh in ordinary use; `title` below is what Studio actually displays,
// and stays exactly `'Type'` -- the file/const names (`typeType.js`,
// `typeType`) are pure JS-level implementation detail with no Sanity
// meaning at all, so they're left as they were rather than renamed to
// chase the schema name (which would also collide with the *Project*
// document's own file, already named `projectType.js`).
//
// Otherwise structurally identical to themeType.js (same shape, same
// reasoning) -- a controlled reference entity that Project now points to
// (see projectType.js's own `projectType` field), the same way Archive
// Item already points to Theme. This is what makes "create a new Type
// from the uploader, the same way you create a new Theme" possible at
// all: the uploader's create-flow (ImportWorkspace.jsx's handleCreateType,
// mirroring handleCreateTheme) does a plain
// `client.create({_type: 'projectType', title})` against a real document
// type -- there is no equivalent "add an option" affordance for a closed
// `options.list` string field, which is why Type moved off that
// representation (see projectType.js's own comment on its `projectType`
// field for the full before/after). Kept intentionally minimal (title
// only), matching Theme's own minimal shape -- nothing about this pass
// required more.
export const typeType = defineType({
  name: 'projectType',
  title: 'Type',
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
    // Same reasoning as themeType.js/projectType.js's own prepare():
    // only replaces the generic "Untitled" placeholder text with
    // something that names what it is.
    prepare({title}) {
      return {title: title || 'New Type'}
    },
  },
})
