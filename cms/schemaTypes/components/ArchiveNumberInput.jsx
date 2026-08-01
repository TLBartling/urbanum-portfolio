import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {set} from 'sanity'
import {TextInput} from '@sanity/ui'

const PAD_LENGTH = 3
const API_VERSION = '2024-01-01'

// Archive Number is meant to be auto-generated -- Josh never types it by
// hand. On mount, if this document is brand new (the field is still
// empty), the component looks up the highest existing archiveNumber in
// the dataset and assigns the next one.
//
// FINAL FORMAT: "001", "002", ... -- plain, zero-padded, no prefix. An
// earlier iteration of this component generated an "AR-0001"-style
// prefixed format to match what the frontend's mock data happened to use
// at the time; the client has since confirmed the simple numeric format
// is the canonical contract going forward, so that prefix has been
// removed. This identifier is permanent: it's used as the join key
// everywhere in the frontend, so the format is locked here and should
// not need to change again.
//
// The field is intentionally NOT marked `readOnly` in the schema itself
// (see archiveItemType.js) -- if it were, Sanity would also block this
// component's own initial `set()` call below, and the number would never
// get assigned. Instead, this component enforces the read-only behavior
// itself: the underlying <TextInput> is always rendered `readOnly`, so
// there is no path in the Studio UI for Josh to edit it by hand, either
// before or after it's been assigned.
//
// KEPT DELIBERATELY, NOT LEFTOVER COMPLEXITY: this component computes the
// numeric maximum itself in JS (fetch every archiveNumber, pull the
// trailing digits out of each with a regex, take the max) instead of the
// simpler `order(archiveNumber desc)[0]` GROQ query, even though the
// canonical contract is now exclusively plain numeric ("001", "002", ...).
// The reason: the original "AR-0001"-format test document was unpublished
// rather than deleted, which in Sanity means it still exists in the
// dataset as a draft -- and the query below is deliberately drafts-
// inclusive (see below), so that document's old-format value is still
// something this generator will encounter. A plain GROQ string sort would
// misrank it, since "AR-0001" sorts as lexicographically "greater than"
// any plain numeric value like "010" -- exactly the collision risk this
// logic exists to prevent. Once that document is permanently deleted
// (not just unpublished), every value left in the dataset will be
// same-length zero-padded plain numeric, string order and numeric order
// will coincide exactly, and this can be safely simplified back to a
// single `order(archiveNumber desc)[0]` query with no JS-side reduction.
// Until then, leave this as is.
//
// Deliberately does NOT exclude drafts here (unlike the frontend's
// ARCHIVE_ITEMS_QUERY, which does) -- an unpublished draft has already
// been assigned a number by this same generator, so it still has to count
// toward "the highest number in use" or a later document could collide
// with it the moment that draft gets published. This is also precisely
// why the still-unpublished legacy test document remains visible to this
// query even though it's excluded from the live frontend data.
export function ArchiveNumberInput(props) {
  const {value, onChange} = props
  const client = useClient({apiVersion: API_VERSION})
  const [isGenerating, setIsGenerating] = useState(!value)

  useEffect(() => {
    if (value) return

    let cancelled = false

    client
      .fetch(`*[_type == "archiveItem" && defined(archiveNumber)].archiveNumber`)
      .then((archiveNumbers) => {
        if (cancelled) return
        const highest = archiveNumbers.reduce((max, current) => {
          const match = typeof current === 'string' ? current.match(/(\d+)$/) : null
          const numeric = match ? parseInt(match[1], 10) : 0
          return Math.max(max, numeric)
        }, 0)
        onChange(set(String(highest + 1).padStart(PAD_LENGTH, '0')))
        setIsGenerating(false)
      })
      .catch(() => {
        if (!cancelled) setIsGenerating(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <TextInput value={isGenerating ? 'Generating…' : value || ''} readOnly />
}
