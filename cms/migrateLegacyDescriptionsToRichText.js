// CMS Legacy Description Migration: populates each document type's rich-
// text Description field (Portable Text) from its old plain-text field,
// wherever the rich-text field is currently empty and the plain-text
// field has real content. Covers the three document types that carry
// this exact legacy-plain-text + new-rich-text pair:
//
//   Project     legacy: `description`   rich text: `descriptionRichText`
//   About Page  legacy: `body`          rich text: `bodyRichText`
//   Contact Page legacy: `body`         rich text: `bodyRichText`
//
// (Confirmed directly against cms/schemaTypes/projectType.js,
// aboutPageType.js, and contactPageType.js -- see this pass's own
// report for the full field trace, including Title/Subtitle on About/
// Contact, which are explicitly NOT touched by this script or this
// pass.)
//
// SAFE BY DEFAULT: running this script with no flags only *finds and
// prints* what would be migrated -- it does not write anything. Nothing
// is changed unless `--commit` is passed explicitly. Same disclosed-
// before-destructive posture as every other script this CMS work has
// produced (removeStaleTagsField.js, seedTypeTaxonomy.js,
// migrateProjectTypeToArray.js).
//
// Usage:
//   cd cms
//   SANITY_TOKEN=<token> node migrateLegacyDescriptionsToRichText.js            # dry run
//   SANITY_TOKEN=<token> node migrateLegacyDescriptionsToRichText.js --commit   # actually writes
//
// AUTH: if you already exported SANITY_TOKEN in this same Terminal
// session for an earlier script this CMS work produced (seedTypeTaxonomy.js,
// removeStaleTagsField.js, migrateProjectTypeToArray.js), that same token
// already works here too -- it's the same client config (same
// projectId/dataset), so there is no need to generate a second, separate
// token just for this script.
//
// NEVER TOUCHES THE LEGACY FIELD'S VALUE: this only ever READS the
// legacy field and WRITES the rich-text field. The legacy field itself
// is never unset, cleared, or modified by this script, on any document,
// in dry-run or --commit mode -- per this pass's own instruction, that
// stays true "unless absolutely necessary," and it never turned out to
// be necessary here. Hiding the legacy field from Studio's editor is a
// separate, schema-level change (see projectType.js/aboutPageType.js/
// contactPageType.js's own `hidden: true`), not something this script
// does.
//
// WHAT COUNTS AS "RICH TEXT ALREADY HAS MEANINGFUL CONTENT": a Portable
// Text array with at least one block containing at least one span whose
// text, trimmed, is non-empty. An empty array, a missing field, or an
// array containing only empty/whitespace-only blocks (which Sanity's own
// editor can leave behind) all count as "empty" -- eligible for
// migration, not skipped.
//
// PARAGRAPH SPLITTING: matches the exact convention already established
// and shipping in src/AboutPage.jsx and src/ContactPage.jsx for how
// these same legacy fields render as multiple paragraphs today --
// `text.split(/\n\s*\n/)` (a blank line, one or more, is a paragraph
// break). Within one paragraph, a single line break is treated as
// ordinary soft wrapping and collapsed to a single space, not preserved
// as a forced break -- Portable Text has no "line break within a
// paragraph" concept in this schema's own constrained shape (see
// richTextType.js's own comment: no arbitrary formatting, deliberately
// narrow), so this is the smallest faithful mapping, not an invented
// one. No other formatting is inferred -- every migrated block is plain
// 'normal' style, no Bold/Italic/Section Heading/links -- exactly "do
// not attempt fancy semantic formatting," per this pass's own
// instruction.
const {createClient} = require('@sanity/client')

const client = createClient({
  projectId: 'zxmuvik1',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN || undefined,
})

const shouldCommit = process.argv.includes('--commit')

const DOCUMENT_CONFIGS = [
  {type: 'project', legacyField: 'description', richField: 'descriptionRichText'},
  {type: 'aboutPage', legacyField: 'body', richField: 'bodyRichText'},
  {type: 'contactPage', legacyField: 'body', richField: 'bodyRichText'},
]

function hasMeaningfulRichText(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return false
  return blocks.some(
    (block) =>
      Array.isArray(block && block.children) &&
      block.children.some(
        (child) => typeof (child && child.text) === 'string' && child.text.trim().length > 0,
      ),
  )
}

function portableTextFromPlainText(plainText) {
  const paragraphs = plainText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0)

  if (paragraphs.length === 0) return null

  return paragraphs.map((text) => ({
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', text, marks: []}],
  }))
}

async function planForConfig(config) {
  // Drafts-inclusive, same reasoning as every other script this CMS work
  // has produced: a document Josh is mid-edit on (a draft) should be
  // migrated too, not skipped because it hasn't been published since.
  const docs = await client.fetch(
    `*[_type == $type]{_id, _type, title, "legacy": ${config.legacyField}, "rich": ${config.richField}}`,
    {type: config.type},
  )

  const toMigrate = []
  const skippedHasRichText = []
  const skippedNoLegacyContent = []

  for (const doc of docs) {
    const alreadyRich = hasMeaningfulRichText(doc.rich)
    const legacyText = typeof doc.legacy === 'string' ? doc.legacy : ''
    const legacyHasContent = legacyText.trim().length > 0

    if (alreadyRich) {
      skippedHasRichText.push(doc)
      continue
    }
    if (!legacyHasContent) {
      skippedNoLegacyContent.push(doc)
      continue
    }

    const blocks = portableTextFromPlainText(legacyText)
    if (!blocks) {
      skippedNoLegacyContent.push(doc)
      continue
    }

    toMigrate.push({doc, blocks})
  }

  return {config, toMigrate, skippedHasRichText, skippedNoLegacyContent}
}

function describeDoc(doc) {
  const label = doc.title || '(untitled)'
  return `${doc._id} [${doc._type}] "${label}"`
}

async function main() {
  const plans = []
  for (const config of DOCUMENT_CONFIGS) {
    plans.push(await planForConfig(config))
  }

  let totalToMigrate = 0

  for (const plan of plans) {
    console.log(`\n=== ${plan.config.type} (${plan.config.legacyField} -> ${plan.config.richField}) ===`)

    console.log(`Will migrate (${plan.toMigrate.length}):`)
    if (plan.toMigrate.length === 0) console.log('  (none)')
    for (const {doc, blocks} of plan.toMigrate) {
      const preview = blocks.map((b) => b.children[0].text).join(' / ')
      console.log(`  - ${describeDoc(doc)}`)
      console.log(`      -> ${blocks.length} paragraph(s): ${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}`)
    }

    console.log(`Skipped -- already has rich text (${plan.skippedHasRichText.length}):`)
    if (plan.skippedHasRichText.length === 0) console.log('  (none)')
    for (const doc of plan.skippedHasRichText) {
      console.log(`  - ${describeDoc(doc)}`)
    }

    console.log(`Skipped -- no legacy content to migrate (${plan.skippedNoLegacyContent.length}):`)
    if (plan.skippedNoLegacyContent.length === 0) console.log('  (none)')
    for (const doc of plan.skippedNoLegacyContent) {
      console.log(`  - ${describeDoc(doc)}`)
    }

    totalToMigrate += plan.toMigrate.length
  }

  console.log(`\nTotal documents to migrate: ${totalToMigrate}`)

  if (!shouldCommit) {
    console.log('\nDry run only -- nothing was changed. Re-run with --commit to write the rich-text field(s) listed above.')
    return
  }

  if (totalToMigrate === 0) {
    console.log('\n--commit passed, but nothing to migrate.')
    return
  }

  console.log('\n--commit passed -- writing rich text for each document above...')

  let transaction = client.transaction()
  for (const plan of plans) {
    for (const {doc, blocks} of plan.toMigrate) {
      transaction = transaction.patch(doc._id, (patch) => patch.set({[plan.config.richField]: blocks}))
    }
  }
  await transaction.commit({autoGenerateArrayKeys: true})

  console.log(`Done. Migrated ${totalToMigrate} document(s). The legacy field on each was left untouched.`)
}

main().catch((error) => {
  console.error('migrateLegacyDescriptionsToRichText.js failed:', error.message)
  process.exitCode = 1
})
