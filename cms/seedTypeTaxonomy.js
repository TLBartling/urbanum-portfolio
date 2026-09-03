// CMS Type Context + Taxonomy Seed Pass ("Seed final Type taxonomy"):
// ensures the 10 final Type documents exist in the production dataset,
// using the EXISTING Type document model -- `projectType` (see
// schemaTypes/typeType.js; the schema's own file is named typeType.js,
// but its registered document `name` is `projectType`, per that file's
// own naming-correction comment). Nothing here creates a new taxonomy
// type, adds a field to any schema, or assigns a Type to any Project.
//
// SAFE BY DEFAULT: running this script with no flags only *finds and
// prints* what already exists and what would be created -- it does not
// write anything. Nothing is created unless `--commit` is passed
// explicitly. Same disclosed-before-destructive posture as
// removeStaleTagsField.js from the prior CMS Polish Pass -- do not
// redesign that posture, just reuse it here for a different field.
//
// Usage:
//   cd cms
//   SANITY_TOKEN=<token> node seedTypeTaxonomy.js            # dry run -- shows the plan only
//   SANITY_TOKEN=<token> node seedTypeTaxonomy.js --commit   # actually creates the missing ones
//
// A token with write access is required for --commit (and, same as
// auditUnknownFields.js/removeStaleTagsField.js, is useful for the dry
// run too, so existing draft-only Type documents -- e.g. one Josh
// started creating from the importer's "+ Create new Type" flow but
// hasn't published yet -- are counted as already existing rather than
// re-created). Never hard-code a token here; read it from the
// environment only.
//
// IDENTIFICATION / IDEMPOTENCY: this schema has no `slug` field and no
// existing stable-id convention for taxonomy documents -- theme.js and
// typeType.js both define only a plain `title` string, and every
// existing Type/Lexicon document already in this dataset (including
// ones created through ImportWorkspace.jsx's own `handleCreateType`,
// which does a plain `client.create({_type: 'projectType', title})`
// with a random id) was created exactly that way. There is nothing to
// "use consistently" here beyond that -- so this script matches the
// same shape (random-id `client.create`) and instead treats an EXACT,
// trimmed `title` match as the uniqueness key: a document already
// exists for a given target title, or it doesn't. This is reported
// explicitly below rather than silently assumed.
//
// DUPLICATES: if more than one existing document already shares the
// exact same trimmed title, that's reported as a duplicate needing a
// human decision -- this script never deletes or merges anything, by
// design (see this pass's own report for why: a script can't safely
// prove which of two same-titled documents, if either, is already
// referenced by a Project without a human check).
const {createClient} = require('@sanity/client')

const client = createClient({
  projectId: 'zxmuvik1',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN || undefined,
})

// Exact final list, in the exact order given.
const TARGET_TYPES = [
  'Residential',
  'Retail',
  'Interiors',
  'Cultural',
  'Office',
  'Art Spaces',
  'Mixed Use',
  'Urban',
  'Object',
  'Adaptive Reuse',
]

const shouldCommit = process.argv.includes('--commit')

async function main() {
  // Drafts-inclusive, same reasoning as ArchiveNumberInput.jsx's and
  // TypeContextField.jsx's own drafts-inclusive queries: a Type Josh
  // started creating but hasn't published should still count as
  // "already exists," not be silently duplicated.
  const existing = await client.fetch(`*[_type == "projectType"]{_id, title}`)

  const byTitle = new Map()
  const duplicates = []
  for (const doc of existing) {
    const key = (doc.title || '').trim()
    if (!byTitle.has(key)) {
      byTitle.set(key, [])
    }
    byTitle.get(key).push(doc._id)
  }
  for (const [title, ids] of byTitle.entries()) {
    if (ids.length > 1) duplicates.push({title, ids})
  }

  const toCreate = TARGET_TYPES.filter((title) => !byTitle.has(title))
  const alreadyPresent = TARGET_TYPES.filter((title) => byTitle.has(title))

  console.log('Type taxonomy seed -- plan:\n')

  console.log(`Already exist (${alreadyPresent.length}/${TARGET_TYPES.length}):`)
  if (alreadyPresent.length === 0) console.log('  (none)')
  for (const title of alreadyPresent) {
    console.log(`  - "${title}" -- ${byTitle.get(title).join(', ')}`)
  }

  console.log(`\nWill create (${toCreate.length}/${TARGET_TYPES.length}):`)
  if (toCreate.length === 0) console.log('  (none -- all 10 already present)')
  for (const title of toCreate) {
    console.log(`  - "${title}"`)
  }

  if (duplicates.length > 0) {
    console.log(`\nWARNING -- duplicate Type documents found (same title, multiple documents).`)
    console.log('These are reported only. Nothing is deleted or merged automatically --')
    console.log('review manually before removing either one (check whether a Project')
    console.log('already references one of them).')
    for (const dup of duplicates) {
      console.log(`  - "${dup.title}": ${dup.ids.join(', ')}`)
    }
  }

  if (!shouldCommit) {
    console.log('\nDry run only -- nothing was changed. Re-run with --commit to create the missing Type(s) listed above.')
    return
  }

  if (toCreate.length === 0) {
    console.log('\n--commit passed, but nothing to create -- all 10 already exist.')
    return
  }

  console.log('\n--commit passed -- creating the missing Type document(s) above...')

  const transaction = toCreate.reduce(
    (tx, title) => tx.create({_type: 'projectType', title}),
    client.transaction(),
  )

  await transaction.commit()

  console.log(`Done. Created ${toCreate.length} Type document(s): ${toCreate.join(', ')}`)
  console.log('No Project was assigned a Type by this script -- that step is intentionally separate.')
}

main().catch((error) => {
  console.error('seedTypeTaxonomy.js failed:', error.message)
  process.exitCode = 1
})
