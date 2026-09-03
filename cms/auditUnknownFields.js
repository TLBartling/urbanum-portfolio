// CMS Polish Pass ("Stale / unknown `tags` field"): a small, read-only
// diagnostic for exactly the class of problem Studio's own "Unknown
// field found" warning surfaces one document at a time -- a property
// that exists in a document's stored JSON but has no corresponding
// field in that document type's *current* schema (schemaTypes/*.js).
// This happens whenever a schema field is removed after documents were
// already created/published under the old schema; Sanity does not
// retroactively strip the now-orphaned property from existing content,
// it just stops offering the field in the editor and warns instead.
//
// This script does NOT write anything. It only queries and prints. It
// exists to answer, in one pass across every document type this Studio
// defines, "besides the already-confirmed `tags` field on Archive Item,
// is anything else in this shape sitting in the live dataset?" --
// without hand-auditing each document individually in Studio.
//
// KNOWN FIELD NAMES BELOW: hand-transcribed directly from this
// project's own schemaTypes/*.js as of the CMS Polish Pass (2026-09-02).
// If a schema field is added, renamed, or removed after this date, this
// list will drift out of sync with reality and should be re-checked
// against the actual schema files before relying on this script again --
// it is a lightweight diagnostic aid, not a live schema introspector.
const KNOWN_FIELDS_BY_TYPE = {
  archiveItem: [
    'image', 'archiveNumber', 'project', 'themes', 'displayRole',
    'sortOrder', 'year', 'fullDate', 'title', 'location', 'description',
    'privateNotes',
  ],
  // CMS Type Multi-Select pass: `projectTypes` (new array field) added.
  // `projectType` (old single reference) is still listed here on
  // purpose -- it remains a real, schema-defined field (hidden,
  // read-only, kept for backward compatibility -- see projectType.js's
  // own comment) until migrateProjectTypeToArray.js has migrated every
  // Project and a later pass removes it from the schema entirely.
  // Removing it from this list before then would make this audit
  // wrongly flag every not-yet-migrated Project's `projectType` value as
  // "unknown."
  project: [
    'title', 'slug', 'sortOrder', 'projectType', 'projectTypes', 'location',
    'year', 'descriptionRichText', 'description',
  ],
  theme: ['title'],
  projectType: ['title'],
  journalEntry: ['image', 'date', 'caption', 'privateNotes'],
  aboutPage: ['title', 'subtitle', 'bodyRichText', 'body'],
  contactPage: ['title', 'subtitle', 'bodyRichText', 'body'],
}

// Every Sanity document carries these regardless of schema; none of
// them are ever "unknown" and none should ever be reported.
const SYSTEM_KEYS = new Set([
  '_id', '_type', '_rev', '_createdAt', '_updatedAt', '_originalId',
])

// Usage: SANITY_TOKEN=<token> node auditUnknownFields.js
// (run from inside the cms/ directory, e.g.
//  `cd cms && SANITY_TOKEN=... node auditUnknownFields.js`)
//
// A token is only required if unpublished drafts should be included in
// the audit (Josh's actual dataset almost certainly has draft documents
// sitting alongside published ones, including some of the very
// `urbanum-import-`-prefixed drafts createImportDrafts.js creates) --
// without one, this only sees published documents, which may miss
// drafts still carrying the stale field. Never hard-code a token here;
// read it from the environment only.
const {createClient} = require('@sanity/client')

const client = createClient({
  projectId: 'zxmuvik1',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN || undefined,
})

async function auditType(typeName, knownFields) {
  const knownSet = new Set(knownFields)
  const docs = await client.fetch(`*[_type == $type]`, {type: typeName})

  const flagged = []
  for (const doc of docs) {
    const unknownKeys = Object.keys(doc).filter(
      (key) => !SYSTEM_KEYS.has(key) && !knownSet.has(key) && !key.startsWith('_'),
    )
    if (unknownKeys.length > 0) {
      flagged.push({
        id: doc._id,
        title: doc.title || doc.archiveNumber || '(untitled)',
        unknownKeys,
        unknownValues: Object.fromEntries(unknownKeys.map((k) => [k, doc[k]])),
      })
    }
  }

  return flagged
}

async function main() {
  console.log('Auditing for unknown/stale fields across all document types...')
  console.log('(read-only -- nothing is written by this script)\n')

  let totalFlagged = 0

  for (const [typeName, knownFields] of Object.entries(KNOWN_FIELDS_BY_TYPE)) {
    const flagged = await auditType(typeName, knownFields)
    if (flagged.length === 0) {
      console.log(`${typeName}: clean (0 documents with unknown fields)`)
      continue
    }

    totalFlagged += flagged.length
    console.log(`${typeName}: ${flagged.length} document(s) with unknown field(s):`)
    for (const item of flagged) {
      console.log(`  - ${item.id} ("${item.title}")`)
      for (const key of item.unknownKeys) {
        console.log(`      ${key}: ${JSON.stringify(item.unknownValues[key])}`)
      }
    }
  }

  console.log(`\nDone. ${totalFlagged} document(s) total carry at least one unknown field.`)
  if (totalFlagged > 0) {
    console.log(
      'Nothing was changed. Review the fields listed above before deciding whether ' +
      'each one is safe to remove (see removeStaleTagsField.js for the pattern used ' +
      'to clean up the one field -- `tags` on archiveItem -- already confirmed obsolete).',
    )
  }
}

main().catch((error) => {
  console.error('Audit failed:', error.message)
  process.exitCode = 1
})
