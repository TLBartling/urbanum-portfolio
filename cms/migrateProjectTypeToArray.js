// CMS Type Multi-Select pass ("Project Type should support multiple
// Types"): converts each Project's OLD single `projectType` reference
// into the NEW `projectTypes` array field (see projectType.js), so a
// Project's Type(s) live in exactly one canonical place going forward.
//
// This is the "migrate" step of an expand -> migrate -> contract schema
// change, done deliberately in three separate, reviewable stages rather
// than one in-place field-type change:
//   1. EXPAND (already done, this pass): `projectTypes` (new array field)
//      added to the schema alongside the old `projectType` field, which
//      stays defined (hidden + read-only) so existing documents' stored
//      values remain valid, not "Unknown field found."
//   2. MIGRATE (this script): copies each Project's existing
//      `projectType` value into `projectTypes` as a one-item array, then
//      removes the old `projectType` value from that document. The old
//      field STAYS in the schema after this runs -- this script only
//      touches document data, never schemaTypes/projectType.js.
//   3. CONTRACT (not part of this pass, deliberately not done here): once
//      every Project has been confirmed migrated, a later pass can delete
//      the old `projectType` field from the schema entirely. Left for a
//      future round, same as the CMS Polish Pass's own `tags` field
//      cleanup was staged as prepare-now/execute-later.
//
// SAFE BY DEFAULT: running this script with no flags only *finds and
// prints* which Projects would be migrated -- it does not write
// anything. Nothing is changed unless `--commit` is passed explicitly.
// Same disclosed-before-destructive posture as removeStaleTagsField.js
// and seedTypeTaxonomy.js from earlier CMS passes.
//
// Usage:
//   cd cms
//   SANITY_TOKEN=<token> node migrateProjectTypeToArray.js            # dry run -- shows the plan only
//   SANITY_TOKEN=<token> node migrateProjectTypeToArray.js --commit   # actually migrates
//
// IDEMPOTENT: only selects Projects that have an old `projectType` value
// AND do not already have a `projectTypes` value -- a Project already
// migrated (or created fresh with `projectTypes` and no `projectType` at
// all) is never touched again by a re-run. Running this script twice in
// a row (the second time with nothing left to migrate) is always safe
// and a no-op.
//
// NEVER DESTRUCTIVE BEYOND THE ONE OLD FIELD: this only ever reads
// `projectType` and writes `projectTypes` + unsets `projectType`, on
// `project` documents. No Archive Item is touched. No Project's title,
// slug, sortOrder, location, year, or description is read or written.
// No document is deleted.
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
  // Drafts-inclusive, same reasoning as this pass's other scripts and
  // TypeContextField.jsx's own drafts-inclusive query: a Project Josh is
  // mid-edit on (a draft) should be migrated too, not skipped because it
  // hasn't been published since.
  const candidates = await client.fetch(
    `*[_type == "project" && defined(projectType) && !defined(projectTypes)]{
      _id,
      title,
      "oldRef": projectType._ref
    }`,
  )

  if (candidates.length === 0) {
    console.log('No Projects need migrating -- every Project either has no Type set, ')
    console.log('already has `projectTypes`, or has already been migrated. Nothing to do.')
    return
  }

  console.log(`Found ${candidates.length} Project(s) to migrate:\n`)
  for (const doc of candidates) {
    console.log(`  - ${doc._id} "${doc.title || '(untitled)'}" -- projectType._ref: ${doc.oldRef}`)
  }

  if (!shouldCommit) {
    console.log(
      '\nDry run only -- nothing was changed. Re-run with --commit to migrate the ' +
      'Project(s) listed above (projectType -> projectTypes: [projectType], then ' +
      'projectType is unset on each one).',
    )
    return
  }

  console.log('\n--commit passed -- migrating each Project above...')

  const transaction = candidates.reduce(
    (tx, doc) =>
      tx.patch(doc._id, (patch) =>
        patch
          .set({projectTypes: [{_type: 'reference', _ref: doc.oldRef}]})
          .unset(['projectType']),
      ),
    client.transaction(),
  )

  await transaction.commit({autoGenerateArrayKeys: true})

  console.log(`Done. Migrated ${candidates.length} Project(s) to \`projectTypes\`.`)
  console.log(
    'The old `projectType` field is still defined in the schema (hidden, read-only) ' +
    'for any Project not yet migrated -- it is not removed by this script.',
  )
}

main().catch((error) => {
  console.error('migrateProjectTypeToArray.js failed:', error.message)
  process.exitCode = 1
})
