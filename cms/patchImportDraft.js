// Small, deliberately thin wrapper around Sanity's own documented mutation
// API (client.patch() -- see sanity.io/docs/apis-and-sdks/js-client-mutations)
// for writing field values onto a draft that already exists. Kept separate
// from createImportDrafts.js on purpose, matching this project's existing
// one-file-per-concern convention (uploadImportImage.js: the Assets API;
// createImportDrafts.js: creating documents via the mutation API) --
// patching an already-created document's fields is a third, distinct
// concern from either of those, not a variation on one of them.
//
// This file does exactly one thing: set field values on an existing draft.
// It never creates a draft (createImportDrafts.js's job), never uploads an
// asset (uploadImportImage.js's job), and never navigates anywhere.
//
// `baseId` is the unprefixed id -- the same shape createImportDrafts.js
// already returns as `baseId` and ImportWorkspace already stores as
// `draftId` on a queue item. The `drafts.` prefix is applied here, the
// same one-line convention createImportDrafts.js already uses; callers
// never construct a `drafts.`-prefixed id themselves.
//
// `autoGenerateArrayKeys: true` is a documented client commit option
// (confirmed against the installed @sanity/client's own type declarations)
// -- it's needed here because `fields` can include array-of-reference
// values (Themes) whose items need a `_key` Sanity assigns automatically
// rather than something this file has to generate by hand.
export function patchImportDraft(client, baseId, fields) {
  return client.patch(`drafts.${baseId}`).set(fields).commit({autoGenerateArrayKeys: true})
}
