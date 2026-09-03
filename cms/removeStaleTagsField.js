// CMS Polish Pass ("Stale / unknown `tags` field"): the confirmed, scoped
// cleanup for exactly one thing -- a `tags` property (an array of plain
// strings, e.g. ["Minimalism"]) that still exists on some already-
// published Archive Item documents from before the Lexicon (`themes`,
// a real reference-array field -- see schemaTypes/archiveItemType.js)
// system replaced it. `tags` itself was already fully removed from the
// schema before this pass ever started; nothing here re-adds it or
// changes archiveItemType.js in any way. This script only removes the
// leftover property from documents that still carry it, which is what
// makes Studio's own "Unknown field found -- tags" warning go away for
// each one.
//
// Confirmed, not guessed: `tags` does not appear anywhere in the current
// schema (grepped across schemaTypes/*.js), is not read or written by
// any current query/normalization/frontend code (grepped across cms/
// and src/ -- the only live references are the removed system's own
// mock data in src/mockArchiveItems.js, which the real Sanity-backed
// path never reads; see src/content/archiveItems.js), and Josh's own
// report ("Unknown field found -- tags", with an old value like
// ["Minimalism"]) is exactly Sanity Studio's standard, built-in warning
// for a stored property with no matching schema field -- not a new or
// speculative diagnosis.
//
// SAFE BY DEFAULT: running this script with no flags only *finds and
// prints* which documents have a `tags` property -- it does not write
// anything. Nothing is removed unless `--commit` is passed explicitly.
// This mirrors the same disclosed-before-destructive posture this
// project's other write-capable scripts (createImportDrafts.js,
// patchImportDraft.js) already follow, just made stricter here since
// this one is a bulk cleanup rather than a single new draft.
//
// Usage:
//   cd cms
//   SANITY_TOKEN=<token> node removeStaleTagsField.js            # dry run -- lists affected docs only
//   SANITY_TOKEN=<token> node removeStaleTagsField.js --commit   # actually unsets `tags` on each one
//
// A token with write access is required for --commit (and is needed for
// the dry run too, to see draft documents alongside published ones --
// see auditUnknownFields.js's own comment on the same point). Never
// hard-code a token here; read it from the environment only.
//
// SCOPE: only ever touches the exact field `tags`, only on documents
// that actually have it, only via `unset` (which removes the one
// property named -- it cannot touch, reorder, or overwrite any other
// field on the document). No document is deleted. No other field is
// ever written, on this type or any other.
const {createClient} = require('@sanity/client')

const client = createClient({
  projectId: 'zxmuvik1',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN || undefined,
})

const shouldCommit = process.argv.includes('--commit')

async function main() {
  const affected = await client.fetch(`*[defined(tags)]{_id, _type, title, archiveNumber, tags}`)

  if (affected.length === 0) {
    console.log('No documents with a `tags` property were found. Nothing to do.')
    return
  }

  console.log(`Found ${affected.length} document(s) with a stale \`tags\` property:\n`)
  for (const doc of affected) {
    const label = doc.title || doc.archiveNumber || '(untitled)'
    console.log(`  - ${doc._id} [${doc._type}] "${label}" -- tags: ${JSON.stringify(doc.tags)}`)
  }

  if (!shouldCommit) {
    console.log(
      '\nDry run only -- nothing was changed. Re-run with --commit to unset `tags` ' +
      'on the document(s) listed above.',
    )
    return
  }

  console.log('\n--commit passed -- unsetting `tags` on each document above...')

  const transaction = affected.reduce(
    (tx, doc) => tx.patch(doc._id, (patch) => patch.unset(['tags'])),
    client.transaction(),
  )

  await transaction.commit()

  console.log(`Done. Removed the stale \`tags\` property from ${affected.length} document(s).`)
}

main().catch((error) => {
  console.error('removeStaleTagsField.js failed:', error.message)
  process.exitCode = 1
})
