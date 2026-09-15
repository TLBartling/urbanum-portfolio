import {useState} from 'react'
import {Box, Flex} from '@sanity/ui'
import {MenuIcon} from '@sanity/icons/Menu'
import {ARCHIVE_TOOL_NAMES} from '../archiveSections'
import {UrbanumArchiveNav} from './UrbanumArchiveNav'
import {useIsMobileStudio} from '../useIsMobileStudio'

const RAIL_WIDTH = 240

// Mobile audit fix (rail): the read-only mobile audit found this
// persistent, always-visible 240px rail to be the single biggest
// mobile blocker -- it wraps every one of ARCHIVE_TOOL_NAMES' eight
// tools (Archive Items/Projects/Themes/Photo Journal AND the four
// singleton pages, including Q&A Page and Site Information), so at
// phone widths it was permanently consuming 56-62% of the viewport for
// every document Josh might open. Below the mobile Studio breakpoint
// (MOBILE_STUDIO_BREAKPOINT in useIsMobileStudio.js, still 768px -- the
// tablet width the audit itself checked and Sanity's own conventional
// tablet/mobile cutoff), the rail below switches from an in-flow
// sidebar to a toggleable overlay drawer (hidden by default) instead,
// so the document/list pane gets essentially the full viewport width --
// matching the client's own stated priority that ordinary content
// editing should stack cleanly on a phone, not merely technically fit.
// Nothing here changes anything at or above this width -- the rail's
// base CSS class below reproduces today's exact width/min-width/
// flex-shrink inline style, unchanged.

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
  // Mobile Studio fix: the drawer/toggle/backdrop below used to switch on
  // a plain @media (max-width) CSS rule (NARROW_BREAKPOINT). Confirmed on
  // a real, freshly-deployed hosted Studio (an actual iPhone, and a
  // resized desktop browser against that same deployment) that CSS
  // switch was NOT reliably taking effect -- see useIsMobileStudio.js for
  // the full diagnosis (most likely a cascade/specificity conflict
  // against @sanity/ui's own Box styling, silently losing a
  // display/position override even when the media query itself matched).
  // isMobileStudio is real JS state instead, read live from
  // window.matchMedia -- same width-only 768px breakpoint, just no
  // longer dependent on a CSS cascade fight to actually apply.
  const isMobileStudio = useIsMobileStudio()
  // Tracks only whether Josh has opened the drawer at a narrow width --
  // meaningless whenever isMobileStudio is false, where the rail is
  // never hidden in the first place. Always starts closed, so a fresh
  // mount always shows the document/list pane at full width first, per
  // the audit's own stated priority.
  const [isNavOpen, setIsNavOpen] = useState(false)

  if (!isArchiveTool) {
    return renderDefault(props)
  }

  const closeNav = () => setIsNavOpen(false)
  // Only actually "open" when both true -- guards against a stuck-open
  // drawer/backdrop if the viewport is resized from mobile back to
  // desktop width while the drawer happened to be open.
  const isDrawerOpen = isMobileStudio && isNavOpen

  // Mobile Studio fix: this used to be a CSS class toggled by a @media
  // rule (see the file-level comment above). Now a plain inline style,
  // applied only when isMobileStudio -- an inline style always wins any
  // cascade fight, so this can't silently lose the way the CSS class did.
  // undefined when not mobile, so the base .urbanum-archive-rail class
  // below (width/min-width/flex-shrink/height -- unconditional, today's
  // exact desktop rail, untouched) is all that applies at desktop widths.
  const railMobileStyle = isMobileStudio
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 20,
        boxShadow: '2px 0 20px rgba(17, 17, 17, 0.2)',
        transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 200ms ease-out',
      }
    : undefined

  return (
    <Flex style={{height: '100%', position: 'relative'}}>
      <style>{`
        .urbanum-archive-rail {
          width: ${RAIL_WIDTH}px;
          min-width: ${RAIL_WIDTH}px;
          flex-shrink: 0;
          height: 100%;
        }
      `}</style>
      <Box className="urbanum-archive-rail" style={railMobileStyle}>
        <UrbanumArchiveNav activeToolName={activeTool.name} onAfterNavigate={closeNav} />
      </Box>
      {/* Backdrop -- only ever rendered while the drawer is genuinely
          open on a mobile-width viewport, so it adds nothing to the DOM
          at desktop widths or whenever the drawer is closed. Absolutely
          positioned against this Flex (not the viewport), so it covers
          the content area below the navbar without needing to know the
          navbar's own height. Tapping it closes the drawer, same as
          tapping a nav item already does. */}
      {isDrawerOpen && (
        <Box
          onClick={closeNav}
          style={{position: 'absolute', inset: 0, backgroundColor: 'rgba(17, 17, 17, 0.25)', zIndex: 15}}
        />
      )}
      {/* Toggle -- not rendered at all when isMobileStudio is false, so
          desktop/wide-tablet never sees this button (mobile Studio fix:
          previously a CSS class hidden via @media -- see the file-level
          comment above). Absolutely positioned against this Flex for the
          same reason the backdrop is. */}
      {isMobileStudio && (
        <button
          type="button"
          onClick={() => setIsNavOpen((open) => !open)}
          aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isNavOpen}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 25,
            display: 'flex',
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
      )}
      {/* Allow native Sanity document panes to scroll on narrow/mobile viewports. */}
      <Box
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {renderDefault(props)}
      </Box>
    </Flex>
  )
}
