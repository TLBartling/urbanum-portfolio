import {Box, Flex} from '@sanity/ui'
import {ARCHIVE_TOOL_NAMES} from '../archiveSections'
import {UrbanumArchiveNav} from './UrbanumArchiveNav'

const RAIL_WIDTH = 240

// Navigation-architecture pass ("one Archive application, four sections"):
// wired in via `studio.components.activeToolLayout` (see sanity.config.js)
// -- a documented override point in the exact same family as `navbar`/
// `toolMenu` (all three live on Sanity's own StudioComponentsPluginOptions,
// all three carry the same @hidden @beta tags UrbanumNavbar.jsx's own
// comments already investigated and concluded reflect version lag against
// Sanity's live docs, not a real stability risk -- the same precedent
// applies here).
//
// Checked directly against the installed 6.7.0 source
// (node_modules/sanity/lib/index.js's StudioLayoutComponent) before
// building this: Sanity's studio shell renders the Navbar, then --
// as a separate, later element in the same top-to-bottom stack, not
// wrapped inside it -- this slot. Its own default implementation
// (StudioActiveToolLayout) does exactly one thing: `<activeTool.component
// tool={activeTool} />`. Nothing else. That means overriding this slot
// lets the rail sit below the navbar, beside the active tool's own
// content, without ever touching the navbar itself -- and that calling
// `renderDefault(props)` for every tool other than the four Archive ones
// reproduces today's behavior exactly, byte for byte. Import and Settings
// are not touched by this file at all.
//
// For the four Archive Structure Tools (see archiveSections.js), this
// wraps that same default render with the persistent rail
// (UrbanumArchiveNav.jsx) -- real Urbanum chrome, not a Structure Tool
// pane, so unlike the root list pane it replaces, it can never collapse
// as Josh drills into a document (see the navigation-architecture
// investigation notes for why a pane-based approach couldn't deliver
// this).
export function UrbanumArchiveLayout(props) {
  const {activeTool, renderDefault} = props
  const isArchiveTool = Boolean(activeTool) && ARCHIVE_TOOL_NAMES.includes(activeTool.name)

  if (!isArchiveTool) {
    return renderDefault(props)
  }

  return (
    <Flex style={{height: '100%'}}>
      <Box style={{width: RAIL_WIDTH, minWidth: RAIL_WIDTH, flexShrink: 0, height: '100%'}}>
        <UrbanumArchiveNav activeToolName={activeTool.name} />
      </Box>
      <Box style={{flex: 1, minWidth: 0, height: '100%', overflow: 'hidden'}}>
        {renderDefault(props)}
      </Box>
    </Flex>
  )
}
