import {useCallback} from 'react'
import {useWorkspace} from 'sanity'
import {useRouter} from 'sanity/router'
import {Box, Stack, Text} from '@sanity/ui'
import {ARCHIVE_SECTIONS} from '../archiveSections'

// Same literal values as ImportWorkspace.jsx's own INK/MUTED_INK/HAIRLINE
// (and UrbanumToolMenu.jsx's NAV_INK/NAV_MUTED_INK) -- duplicated rather
// than cross-imported, same reasoning UrbanumToolMenu.jsx's own comment
// already gives: this file doesn't otherwise share a module with either,
// and introducing one just for a handful of color literals isn't worth
// it.
const INK = '#1a1a1a'
const MUTED_INK = '#9d9d9d'
const HAIRLINE = 'rgba(17, 17, 17, 0.1)'
// Same literal as UrbanumNavbar.jsx's own SHELL_BACKGROUND (UI cohesion
// pass, "Shared Application Shell") -- the Uploader's own Container
// background, applied here too so the rail no longer sits on Sanity's
// default white against a warm off-white navbar above it.
const SHELL_BACKGROUND = '#faf9f5'

// Matches ImportWorkspace.jsx's own sectionHeadingStyle exactly -- "ARCHIVE"
// and "JOURNAL" below are group labels for a cluster of nav items, the
// same role Optional's Story/Display/Notes group headings play in the
// uploader, so they get the same quiet, uppercase, ink-colored treatment
// rather than inventing a new one for this file.
const groupLabelStyle = {
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 500,
  color: INK,
  fontSize: '0.72rem',
}

const navItemStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: '7px 0',
  margin: 0,
  cursor: 'pointer',
  font: 'inherit',
  fontSize: '0.85rem',
}

// One group of nav items under a quiet uppercase label -- "Archive"
// (Archive Items/Projects/Themes) or "Journal" (Photo Journal), per
// archiveSections.js's own `group` field.
function ArchiveNavGroup({label, sections, activeToolName, onNavigate}) {
  return (
    <Stack space={2}>
      <Text size={1} style={groupLabelStyle}>
        {label}
      </Text>
      <Stack space={0}>
        {sections.map((section) => {
          const isActive = section.name === activeToolName
          return (
            <button
              key={section.name}
              type="button"
              style={{
                ...navItemStyle,
                color: isActive ? INK : MUTED_INK,
                fontWeight: isActive ? 600 : 500,
              }}
              onClick={() => onNavigate(section.name)}
            >
              {section.title}
            </button>
          )
        })}
      </Stack>
    </Stack>
  )
}

// The persistent Archive rail -- real Urbanum chrome, not a Structure
// Tool pane (see archiveSections.js's own comment for why that
// distinction is the whole point of this navigation-architecture pass).
// Rendered by UrbanumArchiveLayout.jsx via `studio.components.
// activeToolLayout`, which mounts this component below the navbar and
// beside whichever of the four Archive Structure Tools is currently
// active -- it never unmounts or collapses while Josh is anywhere in the
// Archive, since it isn't part of Structure Tool's own pane layout at
// all.
export function UrbanumArchiveNav({activeToolName}) {
  const router = useRouter()
  const {basePath} = useWorkspace()

  // Same reasoning as ImportWorkspace.jsx's own handleViewLibrary: this
  // component renders inside the active tool's RouteScope (see
  // UrbanumArchiveLayout.jsx/StudioLayoutComponent), so a <StateLink>
  // targeting a *different* tool would get nested under the current
  // tool's own key and fail to resolve -- the exact crash that prompted
  // handleViewLibrary's own fix. router.navigateUrl is the one router
  // method RouteScope doesn't re-scope, so it's used here for the same
  // reason.
  const navigateToSection = useCallback(
    (sectionName) => {
      const path = `/${[basePath, sectionName]
        .map((segment) => (segment || '').replace(/^\/+/, '').replace(/\/+$/, ''))
        .filter(Boolean)
        .join('/')}`
      router.navigateUrl({path})
    },
    [router, basePath],
  )

  const archiveSections = ARCHIVE_SECTIONS.filter((section) => section.group === 'Archive')
  const journalSections = ARCHIVE_SECTIONS.filter((section) => section.group === 'Journal')

  return (
    <Box
      style={{
        height: '100%',
        boxSizing: 'border-box',
        backgroundColor: SHELL_BACKGROUND,
        borderRight: `1px solid ${HAIRLINE}`,
        paddingTop: 28,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Future-thinking note ("unified search," not built this phase):
          this Stack is the natural place a future cross-type search
          field would sit -- as one more child at the very top, above
          the "Archive" group label, so it visibly scopes to the whole
          rail (every section below it) rather than to any one group.
          Nothing below assumes a fixed number of children or a fixed
          height, so adding one later is a single new Stack child, not a
          restructure. */}
      <Stack space={6}>
        <ArchiveNavGroup
          label="ARCHIVE"
          sections={archiveSections}
          activeToolName={activeToolName}
          onNavigate={navigateToSection}
        />
        <Box style={{borderTop: `1px solid ${HAIRLINE}`}} />
        <ArchiveNavGroup
          label="JOURNAL"
          sections={journalSections}
          activeToolName={activeToolName}
          onNavigate={navigateToSection}
        />
      </Stack>
    </Box>
  )
}
