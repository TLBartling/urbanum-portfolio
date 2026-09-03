// Contact Page Content Repair pass: a narrowly-scoped diagnostic + repair
// script for ONE document only -- the published Contact Page singleton
// (_type == "contactPage"). This is deliberately NOT a rerun of
// migrateLegacyDescriptionsToRichText.js and does not touch any other
// document, document type, or field. It exists because the Contact page
// went blank and this is the smallest tool needed to (a) show exactly
// what is currently stored so the real cause can be confirmed, and (b)
// -- only with --commit, and only if nothing unexpected is already
// there -- write the correct `bodyRichText` content back in, matching
// the approved design exactly.
//
// SAFE BY DEFAULT: with no flags, this only reads and prints. Nothing is
// written unless --commit is passed. If `bodyRichText` already contains
// real (non-whitespace) content that doesn't look like a leftover empty
// block, --commit refuses to overwrite it and asks for --force instead
// -- this script should never silently clobber something real.
//
// NEVER TOUCHES: `title`, `subtitle`, or the legacy `body` field on this
// document; any other document; any schema file.
//
// Usage:
//   cd cms
//   SANITY_TOKEN=<token> node repairContactDescription.js            # diagnose only
//   SANITY_TOKEN=<token> node repairContactDescription.js --commit   # write, if safe
//   SANITY_TOKEN=<token> node repairContactDescription.js --commit --force  # write anyway

const {createClient} = require('@sanity/client')

const client = createClient({
  projectId: 'zxmuvik1',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN || undefined,
})

const shouldCommit = process.argv.includes('--commit')
const shouldForce = process.argv.includes('--force')

// Same "meaningful content" definition already established in
// migrateLegacyDescriptionsToRichText.js: true only if some block has
// some span with non-whitespace text. An empty array, a missing field,
// or an array containing only empty/whitespace-only blocks (which
// Sanity's own editor can leave behind after a click into an empty
// field) all count as "not meaningful."
function hasMeaningfulRichText(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return false
  return blocks.some(
    (block) =>
      Array.isArray(block && block.children) &&
      block.children.some(
        (child) => typeof child.text === 'string' && child.text.trim() !== '',
      ),
  )
}

function hasMeaningfulPlainText(text) {
  return typeof text === 'string' && text.trim() !== ''
}

// The approved Contact content, matching the approved visual hierarchy
// exactly:
//   Urbānum                                    -- Section Heading
//   Office For Architecture                    -- Section Heading, Muted
//   25 SE 2nd Avenue, Suite 550 / Miami, Florida 33131 / T 305.209.1587
//                                               -- one Normal paragraph,
//                                                  three lines (soft line
//                                                  breaks -- see
//                                                  styles.css's
//                                                  .contact-layout__paragraph
//                                                  white-space: pre-line)
//   info@studiourbanum.com                     -- own Normal paragraph,
//                                                  Medium emphasis, mailto link
//   "For employment inquiries..."               -- Normal paragraph
//   "Submissions should be in PDF format..." +
//     resume@studiourbanum.com on the next line
//     within the SAME paragraph                -- Medium emphasis, mailto link
//   "For inquiries related to owner representation..." -- Normal paragraph
const CONTACT_BODY_RICH_TEXT = [
  {
    _type: 'block',
    style: 'h2',
    markDefs: [],
    children: [{_type: 'span', text: 'Urbānum', marks: []}],
  },
  {
    _type: 'block',
    style: 'h2',
    markDefs: [],
    children: [
      {_type: 'span', text: 'Office For Architecture', marks: ['muted']},
    ],
  },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        text: '25 SE 2nd Avenue, Suite 550\nMiami, Florida 33131\nT 305.209.1587',
        marks: [],
      },
    ],
  },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [
      {_type: 'link', _key: 'link-info-email', href: 'mailto:info@studiourbanum.com'},
    ],
    children: [
      {
        _type: 'span',
        text: 'info@studiourbanum.com',
        marks: ['medium', 'link-info-email'],
      },
    ],
  },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        text: 'For employment inquiries, please send a resume and work samples.',
        marks: [],
      },
    ],
  },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [
      {_type: 'link', _key: 'link-resume-email', href: 'mailto:resume@studiourbanum.com'},
    ],
    children: [
      {
        _type: 'span',
        text: 'Submissions should be in PDF format, no larger than 10mb.\n',
        marks: [],
      },
      {
        _type: 'span',
        text: 'resume@studiourbanum.com',
        marks: ['medium', 'link-resume-email'],
      },
    ],
  },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        text: 'For inquiries related to owner representation services, please send a request.',
        marks: [],
      },
    ],
  },
]

async function main() {
  const doc = await client.fetch(
    `*[_type == "contactPage" && !(_id in path("drafts.**"))][0]{_id, title, subtitle, body, bodyRichText}`,
  )

  if (!doc) {
    console.log('No published Contact Page document found. Nothing to diagnose or repair.')
    console.log('(A draft-only document would not show here -- check Studio for an unpublished draft.)')
    return
  }

  const richMeaningful = hasMeaningfulRichText(doc.bodyRichText)
  const legacyMeaningful = hasMeaningfulPlainText(doc.body)

  console.log('--- Current Contact Page document ---')
  console.log('_id:', doc._id)
  console.log('title:', JSON.stringify(doc.title ?? null))
  console.log('subtitle:', JSON.stringify(doc.subtitle ?? null))
  console.log('body (legacy plain text):', JSON.stringify(doc.body ?? null))
  console.log('bodyRichText (raw):', JSON.stringify(doc.bodyRichText ?? null, null, 2))
  console.log()
  console.log('--- Diagnosis ---')
  if (!doc.bodyRichText || doc.bodyRichText.length === 0) {
    console.log('bodyRichText is genuinely empty (no field, or an empty array).')
  } else if (!richMeaningful) {
    console.log(
      'bodyRichText is a NON-EMPTY array but contains no non-whitespace text -- ' +
        'this is almost certainly the bug: the frontend used to treat any non-empty ' +
        'array as "has content" and would render this (visually blank) instead of ' +
        'falling back to the legacy body field. That frontend check has been fixed ' +
        'in src/ContactPage.jsx as part of this same repair.',
    )
  } else {
    console.log(
      'bodyRichText already contains real (non-whitespace) text. Printed above -- ' +
        'review it before deciding whether to overwrite.',
    )
  }
  console.log(
    legacyMeaningful
      ? 'Legacy body field: HAS real content (shown above).'
      : 'Legacy body field: empty or missing.',
  )
  console.log()
  console.log('--- Proposed replacement bodyRichText (not yet written) ---')
  console.log(JSON.stringify(CONTACT_BODY_RICH_TEXT, null, 2))

  if (!shouldCommit) {
    console.log()
    console.log('Dry run only. Re-run with --commit to write the proposed content above.')
    return
  }

  if (richMeaningful && !shouldForce) {
    console.log()
    console.log(
      'REFUSING TO WRITE: bodyRichText already has real, non-whitespace content ' +
        '(printed above) and --force was not passed. Review it first -- if it should ' +
        'still be replaced with the approved content above, re-run with --commit --force.',
    )
    return
  }

  await client
    .patch(doc._id)
    .set({bodyRichText: CONTACT_BODY_RICH_TEXT})
    .commit({autoGenerateArrayKeys: true})

  console.log()
  console.log(`Wrote bodyRichText to ${doc._id}. title/subtitle/body were not touched.`)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
