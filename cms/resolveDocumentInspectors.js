// Ellipsis-menu cleanup, continued (found during the Archive Number
// root-cause investigation): the document pane's overflow menu was still
// showing History and Incoming References, Sanity's own raw defaults,
// even after the earlier document-actions round supposedly simplified
// this menu down to Publish/Delete. Checked directly against the
// installed 6.7.0 structureTool bundle rather than assumed: every
// `structureTool()` plugin instance independently contributes
// `document.inspectors: (prevInspectors) => Array.from(new
// Set([...prevInspectors, ...inspectors]))`, where `inspectors` is a
// fixed module-level array of three built-ins (validation, history,
// incoming references). The earlier document-actions round only ever
// added an app-level `document.actions` resolver -- there was never a
// matching `document.inspectors` resolver, so this menu has been showing
// Sanity's raw defaults since that round, unrelated to the navigation
// refactor. (Also confirmed: because the union above is a `Set` over the
// same shared inspector objects, going from one structureTool() instance
// to four -- this Studio's navigation-architecture pass -- doesn't add
// duplicates or change what's in this list at all; it's deduped by
// object identity either way.)
//
// Only two of the three default inspectors are removed here, on purpose.
// Checked directly against the installed source for what's actually
// reachable through this config surface:
//   - "sanity/structure/history" (History) and
//     "sanity/structure/incoming-references" (Incoming References) are
//     both ordinary entries in the `inspectors` array above -- removable
//     here, the documented way, same shape and same plugin family
//     `resolveDocumentActions.js` already uses successfully for
//     `document.actions`.
//   - "sanity/structure/validation" is deliberately left alone: it's the
//     validation-status inspector, not a raw Sanity concept Josh needs
//     translated away, and hiding it would remove real, useful signal
//     (e.g. it's what would have visibly flagged an Archive Item
//     missing its Archive Number, back when that bug was live).
//   - Inspect (the raw-JSON dialog), Compare versions, and Inline
//     changes are NOT part of the `inspectors` array at all -- they're
//     hardcoded directly into the document pane header's own menu
//     assembly logic. Copy document/Paste document come from
//     `CopyPasteProvider`, which the installed source shows wraps every
//     document pane unconditionally, with no per-type opt-out exposed
//     anywhere in the public config. None of those four are reachable
//     from this file or any other documented API -- left alone rather
//     than removed via an internal API or a DOM/CSS hack.
const REMOVED_INSPECTOR_NAMES = new Set([
  'sanity/structure/history',
  'sanity/structure/incoming-references',
])

// The four document types Josh actually works with inside the Archive --
// same list resolveDocumentActions.js already uses for the same reason
// (see that file's own comment on why every other document type this
// Studio might ever register is left untouched).
const LIBRARY_DOCUMENT_TYPES = ['archiveItem', 'journalEntry', 'project', 'theme']

// The `document.inspectors` resolver sanity.config.js wires in. Note this
// context shape is NOT the same as `document.actions`'s: checked directly
// against the installed 6.7.0 type declarations, `DocumentInspectorContext`
// exposes `documentType`, while `DocumentActionsContext` (what
// resolveDocumentActions.js reads) exposes `schemaType` -- two different
// field names for what is, on both, the same underlying type string.
// Copying `context.schemaType` verbatim from that file into this one
// would silently never match anything.
export function resolveDocumentInspectors(prevInspectors, context) {
  if (!LIBRARY_DOCUMENT_TYPES.includes(context.documentType)) {
    return prevInspectors
  }

  return prevInspectors.filter((inspector) => !REMOVED_INSPECTOR_NAMES.has(inspector.name))
}
