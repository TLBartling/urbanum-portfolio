// Small, deliberately thin wrapper around Sanity's own documented
// mutation API (client.transaction() / .create() / .commit() -- see
// sanity.io/docs/apis-and-sdks/js-client-mutations) for creating one
// draft document per already-uploaded image. Kept separate from
// uploadImportImage.js on purpose: uploading a file (the Assets API) and
// creating a content document (the mutation API) are two different
// Sanity APIs, not one operation artificially split across two files.
//
// Each created document starts minimal: `_type`, the `image` field
// (pointing at the asset already uploaded via uploadImportImage.js, by
// reference -- never re-uploaded), and -- for Archive Item only, see the
// ARCHIVE NUMBER comment below -- `archiveNumber`. Every other field --
// Project, Themes, Tags, Sort Order, and so on -- is still left entirely
// to Studio's own native document editor (or, for most of them in
// practice, ImportWorkspace.jsx's own guided steps) to collect. Nothing
// here duplicates schema or validation beyond the one exception below.
//
// ID NAMESPACING (new this milestone): the random component of each
// draft's id is prefixed "urbanum-import-" rather than being a bare
// UUID. This is the smallest possible change that lets
// ImportWorkspace.jsx reliably find "drafts this tool created and Josh
// hasn't finished yet" after a full page navigation wipes its in-memory
// state (see ImportWorkspace.jsx's PENDING_DRAFTS_QUERY). Without a
// namespaced id, that query would have no reliable way to tell a
// freshly-imported draft apart from any other unrelated unpublished
// document already sitting in this dataset -- and this dataset already
// has one (see ArchiveNumberInput.jsx's comments on the old unpublished
// test document). This is a query-matching detail only; it does not
// change what gets created, how, or the `drafts.` trade-off documented
// below.
//
// KNOWN, DISCLOSED TRADE-OFF: documents are created directly as drafts
// (`_id` prefixed with `drafts.`) rather than as published documents.
// This is the same underlying mechanism this Studio's existing documents
// already rely on for every unpublished edit (see ArchiveNumberInput.jsx's
// own comments on querying drafts-inclusively -- that component depends
// on exactly this `drafts.` convention already being in live use in this
// dataset). Sanity's current documentation notes this specific API usage
// ("using our APIs to create document IDs prefixed with `drafts.`") as
// something they now "advise against," in favor of the newer Content
// Releases `createVersion()` API. This project uses Content Releases
// nowhere else, its availability depends on the Sanity plan this project
// is on (unconfirmed), and it's a meaningfully heavier feature (built
// around bundling documents into a release) than "one plain draft, same
// as every other document already in this dataset." Using the plain
// `drafts.` id keeps these documents in exactly the same single-document
// draft state every other Archive Item or Journal Entry in this Studio
// is already in -- which is also what lets the Intent `edit` handoff
// open them in Studio's ordinary document editor, not something new.
// Flagged here and in this milestone's report as a disclosed choice, not
// a silent one -- worth revisiting if Sanity ever fully removes direct
// `drafts.` id support rather than merely discouraging it.
//
// ARCHIVE NUMBER (added during the Archive Number root-cause fix): every
// other field this function deliberately leaves to Studio's own document
// editor to collect (see the comment above) -- Archive Number is the one
// exception, and only for Archive Item. Archive Number was originally
// meant to be assigned by ArchiveNumberInput.jsx, a field-level input
// component whose assignment logic only runs when Sanity's own
// FormBuilder mounts that field inside a real document pane. The guided
// uploader (ImportWorkspace.jsx) never does that -- it collects every
// field through its own custom step UI and publishes via
// `useDocumentOperation(...).publish.execute()`, the raw operation,
// which (confirmed against the installed 6.7.0 structureTool bundle) does
// not enforce field validation the way Studio's native Publish button
// does. So a document created and published entirely through the guided
// wizard could complete with no Archive Number ever assigned -- this is
// the fix for that gap, not a new design: ArchiveNumberInput.jsx's own
// comments already describe a drafts-inclusive numbering scheme, meaning
// the original intent was always for a number to exist as soon as a
// draft does, not only once Josh happens to open it in Studio.
// ArchiveNumberInput.jsx itself is untouched and stays in place as a
// fallback -- for any Archive Item created directly in Studio (bypassing
// this function entirely), its own mount-time assignment still runs
// exactly as before.
//
// Computed once per batch, not once per item: `computeNextArchiveNumbers`
// fetches the dataset's current highest number a single time, then hands
// out consecutive numbers to every Archive Item in this batch locally --
// the same one-call-then-increment shape ArchiveNumberInput.jsx's own
// reduce-based algorithm already uses to guard against the "AR-0001"
// legacy-format collision risk documented there (same query, same
// trailing-digit regex, same zero-padding). Journal Entry has no
// `archiveNumber` field (checked directly against journalEntryType.js --
// no such field is defined), so this only ever runs, and only ever
// writes into the transaction, when `docType === 'archiveItem'`.
const ARCHIVE_NUMBER_DOC_TYPE = 'archiveItem'
const ARCHIVE_NUMBER_PAD_LENGTH = 3

// Uses whatever apiVersion the caller's `client` is already configured
// with -- ImportWorkspace.jsx's own `client` (the only caller today) is
// already pinned to the same '2024-01-01' apiVersion ArchiveNumberInput.jsx
// uses, so there's nothing to reconcile; a second, separately-pinned
// client here would just be redundant indirection.
async function computeNextArchiveNumbers(client, count) {
  const existingNumbers = await client.fetch(
    `*[_type == "${ARCHIVE_NUMBER_DOC_TYPE}" && defined(archiveNumber)].archiveNumber`,
  )

  const highest = existingNumbers.reduce((max, current) => {
    const match = typeof current === 'string' ? current.match(/(\d+)$/) : null
    const numeric = match ? parseInt(match[1], 10) : 0
    return Math.max(max, numeric)
  }, 0)

  return Array.from({length: count}, (_, index) =>
    String(highest + index + 1).padStart(ARCHIVE_NUMBER_PAD_LENGTH, '0'),
  )
}

export async function createImportDrafts(client, docType, items) {
  const itemsWithBaseId = items.map((item) => ({
    ...item,
    baseId: `urbanum-import-${crypto.randomUUID()}`,
  }))

  const archiveNumbers =
    docType === ARCHIVE_NUMBER_DOC_TYPE
      ? await computeNextArchiveNumbers(client, itemsWithBaseId.length)
      : null

  const transaction = itemsWithBaseId.reduce(
    (tx, item, index) =>
      tx.create({
        _id: `drafts.${item.baseId}`,
        _type: docType,
        image: {_type: 'image', asset: {_type: 'reference', _ref: item.asset._id}},
        ...(archiveNumbers ? {archiveNumber: archiveNumbers[index]} : {}),
      }),
    client.transaction(),
  )

  await transaction.commit()

  return itemsWithBaseId
}
