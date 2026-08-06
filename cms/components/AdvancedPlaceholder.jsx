import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {Box, Button, Card, Container, Flex, Stack, Text} from '@sanity/ui'

// System redesign pass: this was Milestone 2A's deliberately empty
// "Advanced" (later "Settings" -- see UrbanumToolMenu.jsx's own rename
// comment) placeholder -- "Nothing lives here yet." That placeholder
// content is fully removed here and replaced with a real, minimal
// information page. This is still explicitly NOT a settings/
// configuration surface: no toggles, preferences, or editable options
// are introduced anywhere below -- everything on this page is either
// read-only identification (name, version, date) or live data queried
// from Sanity, never something Josh can change from here. Structure
// access, Vision (if reinstalled), and dataset/API tooling remain a
// later phase per the original Milestone 2 assessment; nothing about
// that phased plan changed, this page just now looks finished while
// that phase hasn't arrived yet, instead of reading as an obvious
// placeholder.
//
// Deliberately plain, default @sanity/ui styling -- no custom palette
// borrowed from ImportWorkspace.jsx, no icons -- per the brief's own
// design direction ("quiet, finished... not a dashboard"). Hierarchy is
// carried entirely by type size/weight/muted-color and Stack spacing,
// the same restrained toolkit this file already used before this pass.
//
// Refinement pass ("SYSTEM page refinement"): the one exception to "no
// Card" is the single <Card border> below wrapping Portfolio Overview
// through Support -- added because the brief explicitly asked for it
// ("wrap everything from Portfolio Overview through Support into one
// subtle bordered card"), using Card's own default (unset-tone) border,
// the exact same hairline gray already used natively throughout Studio
// elsewhere, not an invented color. The System header block and the
// footer stay outside it, unchanged, per the brief's own section
// boundaries.
//
// Cleanup pass ("SYSTEM page cleanup"): removes the intro block above
// the Card entirely -- the "System" label, "Urbanum Archive" heading,
// and introductory paragraph were dropped per the brief, and the Card
// moves up into that vacated space by simple removal (the enclosing
// Stack space={6} already supplied the gap between the intro block
// and the Card, so with the intro block gone that same gap now sits
// between the Box's existing paddingTop and the Card -- no new
// spacing value introduced). labelStyle is untouched: SectionLabel
// below still depends on it for Portfolio Overview/Version/
// Documentation/Support.
//
// Layout pass ("SYSTEM page layout"): the whole column -- System label,
// heading, paragraph, Card, and footer alike -- now shares one width
// (CONTENT_WIDTH below) and is wrapped in a <Flex justify="center"> so
// it reads as one centered, vertically aligned composition instead of a
// left-hugging block. The paragraph previously ran the Container's full
// width while only the Card was narrowed, which is exactly the "feels
// disconnected" the brief called out. Text itself stays left-aligned
// within the column (an editorial/architectural column reads better
// than centered prose); only the column as a whole is centered on the
// page.

const API_VERSION = '2024-01-01'

// One document type per section this Studio manages (schemaTypes/
// index.js) -- the same four types archiveSections.js already treats as
// the whole of what this CMS holds. The drafts.** exclusion below is the
// same "count only what's actually live" filter src/cms/queries.js's own
// ARCHIVE_ITEMS_QUERY/PROJECTS_QUERY/THEMES_QUERY/JOURNAL_ENTRIES_QUERY
// already use for the public site -- reused here so "Portfolio Overview"
// reports the same live counts the portfolio itself would show, rather
// than a raw document count that double-counts anything with both a
// draft and a published version.
const PORTFOLIO_COUNTS_QUERY = `{
  "projects": count(*[_type == "project" && !(_id in path("drafts.**"))]),
  "archiveImages": count(*[_type == "archiveItem" && !(_id in path("drafts.**"))]),
  "journalEntries": count(*[_type == "journalEntry" && !(_id in path("drafts.**"))]),
  "themes": count(*[_type == "theme" && !(_id in path("drafts.**"))])
}`

const PORTFOLIO_COUNT_ROWS = [
  {key: 'projects', label: 'Projects'},
  {key: 'archiveImages', label: 'Archive Images'},
  {key: 'journalEntries', label: 'Journal Entries'},
  {key: 'themes', label: 'Themes'},
]

// Hardcoded per the brief ("current value can be hardcoded for now") --
// no document or config field this could be read from exists yet.
const LAST_UPDATED = 'August 4, 2026'

// Layout pass ("SYSTEM page layout"): one shared width for the entire
// page column -- System label, heading, intro paragraph, and the Card
// all measure against this same value now, rather than the paragraph
// running full-width while only the Card was narrowed. Same 420 the
// Card alone used before this pass; nothing about the visual scale
// changed, only what shares it.
const CONTENT_WIDTH = 420

const labelStyle = {
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

function SectionLabel({children}) {
  return (
    <Text size={1} muted weight="semibold" style={labelStyle}>
      {children}
    </Text>
  )
}

function InfoRow({label, value}) {
  return (
    <Flex justify="space-between" align="baseline" gap={4}>
      <Text size={1} muted>
        {label}
      </Text>
      <Text size={1}>{value}</Text>
    </Flex>
  )
}

export function AdvancedPlaceholder() {
  const client = useClient({apiVersion: API_VERSION})
  // null = not loaded yet; each row shows an em dash until this resolves.
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let isMounted = true

    client.fetch(PORTFOLIO_COUNTS_QUERY).then(
      (result) => {
        if (isMounted) setCounts(result)
      },
      (error) => {
        console.error('[System] Failed to load portfolio counts.', error)
      },
    )

    return () => {
      isMounted = false
    }
  }, [client])

  return (
    <Container width={1} padding={6}>
      <Flex justify="center">
        <Box paddingTop={5} style={{width: '100%', maxWidth: CONTENT_WIDTH}}>
          <Stack space={6}>
            <Card border radius={2} padding={5}>
              <Stack space={6}>
                <Stack space={3}>
                  <SectionLabel>Portfolio Overview</SectionLabel>
                  <Stack space={2}>
                    {PORTFOLIO_COUNT_ROWS.map(({key, label}) => (
                      <InfoRow
                        key={key}
                        label={label}
                        value={counts ? counts[key] : '—'}
                      />
                    ))}
                  </Stack>
                </Stack>

                <Stack space={3}>
                  <SectionLabel>Version</SectionLabel>
                  <Stack space={2}>
                    <InfoRow label="Urbanum Studio" value="Prototype v0.9" />
                    <InfoRow label="Last Updated" value={LAST_UPDATED} />
                  </Stack>
                </Stack>

                <Stack space={3}>
                  <SectionLabel>Documentation</SectionLabel>
                  <Box>
                    <Button text="Open Developer Notes" mode="ghost" tone="default" />
                  </Box>
                </Stack>

                <Stack space={3}>
                  <SectionLabel>Support</SectionLabel>
                  <InfoRow label="Developer" value="TL Bartling" />
                </Stack>
              </Stack>
            </Card>

            <Box paddingTop={2}>
              <Text size={1} muted>
                © 2026 TL Bartling
              </Text>
            </Box>
          </Stack>
        </Box>
      </Flex>
    </Container>
  )
}
