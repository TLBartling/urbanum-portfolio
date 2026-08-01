// Small, deliberately thin wrapper around Sanity's own documented Assets
// API (client.assets.upload -- see sanity.io/docs/apis-and-sdks/js-client-assets,
// which confirms upload() "returns a promise that resolves to the created
// asset document" with no parent content document required). Kept
// separate from ImportWorkspace.jsx's presentation code, per this
// milestone's guidance to keep upload logic and presentation apart where
// reasonable -- but it stays exactly this small on purpose. No retry
// logic, no queue manager, no event system: those are real future
// milestones, not something to anticipate here.
export function uploadImportImage(client, file) {
  return client.assets.upload('image', file, {filename: file.name})
}
