import {useState} from 'react'
import {Box, Flex} from '@sanity/ui'
import {MenuIcon} from '@sanity/icons/Menu'
import {ARCHIVE_TOOL_NAMES} from '../archiveSections'
import {UrbanumArchiveNav} from './UrbanumArchiveNav'

const RAIL_WIDTH = 240

// Mobile audit fix (rail): the read-only mobile audit found this
// persistent, always-visible 240px rail to be the single biggest
// mobile blocker -- it wraps every one of ARCHIVE_TOOL_NAMES' eight
// tools (Archive Items/Projects/Themes/Photo Journal AND the four
// singleton pages, including Q&A Page and Site Information), so at
// phone widths it was permanently consuming 56-62% of the viewport for
// every document Josh might open. Below this width, the rail below
// switches from an in-flow sidebar to a toggleable overlay drawer
// (hidden by default) instead, so the document/list pane gets
// essentially the full viewport width -- matching the client's own
// stated priority that ordinary content editing should stack cleanly
// on a phone, not merely technically fit. 768px matches the tablet
// width the audit itself checked and Sanity's own conventional
// tablet/mobile cutoff. Nothing here changes anything at or above this
// width -- the rail's base CSS class below reproduces today's exact
// width/min-width/flex-shrink inline style, unchanged.
const NARROW_BREAKPOINT = 768

const TOGGLE_INK = '#1a1a1a'
const TOGGLE_HAIRLINE = 'rgba(17, 17, 17, 0.1)'

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
  // Mobile audit fix (rail): tracks only whether Josh has opened the
  // drawer at a narrow width -- meaningless above NARROW_BREAKPOINT,
  // where the CSS below never hides the rail in the first place. Always
  // starts closed, so a fresh mount always shows the document/list pane
  // at full width first, per the audit's own stated priority.
  const [isNavOpen, setIsNavOpen] = useState(false)

  if (!isArchiveTool) {
    return renderDefault(props)
  }

  const closeNav = () => setIsNavOpen(false)

  return (
    <Flex style={{height: '100%', position: 'relative'}}>
      <style>{`
        .urbanum-archive-rail {
          width: ${RAIL_WIDTH}px;
          min-width: ${RAIL_WIDTH}px;
          flex-shrink: 0;
          height: 100%;
        }
        .urbanum-archive-rail-toggle {
          display: none;
        }
        @media (max-width: ${NARROW_BREAKPOINT}px) {
          .urbanum-archive-rail {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 20;
            box-shadow: 2px 0 20px rgba(17, 17, 17, 0.2);
            transform: translateX(-100%);
            transition: transform 200ms ease-out;
          }
          .urbanum-archive-rail[data-open='true'] {
            transform: translateX(0);
          }
          .urbanum-archive-rail-toggle {
            display: flex;
          }
        }
      `}</style>
      <Box className="urbanum-archive-rail" data-open={isNavOpen ? 'true' : 'false'}>
        <UrbanumArchiveNav activeToolName={activeTool.name} onAfterNavigate={closeNav} />
      </Box>
      {/* Backdrop -- only ever rendered while the drawer is open, so it
          adds nothing to the DOM at all above NARROW_BREAKPOINT or
          whenever the drawer is closed. Absolutely positioned against
          this Flex (not the viewport), so it covers the content area
          below the navbar without needing to know the navbar's own
          height. Tapping it closes the drawer, same as tapping a nav
          item already does. */}
      {isNavOpen && (
        <Box
          onClick={closeNav}
          style={{position: 'absolute', inset: 0, backgroundColor: 'rgba(17, 17, 17, 0.25)', zIndex: 15}}
        />
      )}
      {/* Toggle -- hidden above NARROW_BREAKPOINT (see
          .urbanum-archive-rail-toggle above), so desktop/wide-tablet
          never renders this button at all. Absolutely positioned
          against this Flex for the same reason the backdrop is. */}
      <button
        type="button"
        className="urbanum-archive-rail-toggle"
        onClick={() => setIsNavOpen((open) => !open)}
        aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isNavOpen}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 25,
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: `1px solid ${TOGGLE_HAIRLINE}`,
          backgroundColor: 'white',
          color: TOGGLE_INK,
          boxShadow: '0 1px 6px rgba(17, 17, 17, 0.2)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <MenuIcon style={{fontSize: 20}} />
      </button>
      <Box style={{flex: 1, minWidth: 0, height: '100%', overflow: 'hidden'}}>
        {renderDefault(props)}
      </Box>
    </Flex>
  )
}
