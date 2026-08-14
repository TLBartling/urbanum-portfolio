import {StateLink} from 'sanity/router'
import {Flex} from '@sanity/ui'
import {ARCHIVE_TOOL_NAMES, DEFAULT_ARCHIVE_TOOL_NAME} from '../archiveSections'

// Groups Studio's existing `tools` array under the IMPORT / ARCHIVE /
// SYSTEM hierarchy from the Milestone 2 assessment, via
// `studio.components.toolMenu` -- a documented override point
// (sanity.io/docs describes it as stable; the installed 6.7.0 package's
// own .d.ts marks the containing `ToolMenuProps`/`StudioComponents`
// interfaces `@hidden @beta`, which the Milestone 2 assessment concluded
// is most likely version lag against Sanity's live docs rather than a
// genuine internal-API risk -- see that report for the full reasoning).
// `renderDefault` is deliberately never invoked: per Sanity's own docs,
// skipping it means providing entirely custom markup for this slot,
// which is what a real grouped nav requires here.
//
// This does not touch any individual tool's own behavior -- it only
// decides how the existing Tool objects are labeled, grouped, and linked.
// `urbanum-import` stays first/default exactly as it is today.
//
// Visual-polish pass ("Sanity header," item 3): "Advanced" renamed to
// "Settings" -- the final Studio navigation the mockup specifies -- and
// the group label itself is now the clickable link (see below) rather
// than a separate muted label sitting above a differently-worded tool
// link. The underlying `advanced` Tool object/route is untouched; only
// this display label changed.
//
// Round E ("Settings" sub-navigation): the previous version of this
// file grouped tools by `TOOL_GROUP[tool.name] || 'Settings'` -- any
// tool name it didn't recognize fell into Settings by default. That
// silently swept in tools this project never registered at all:
// Sanity's own Studio ships built-in tools for things like Scheduled
// Publishing and Content Releases, auto-added to `tools` by Sanity
// itself whenever those features are enabled on the project, entirely
// independent of the `tools` array in sanity.config.js. Once more than
// one tool landed in "Settings" this way, the render logic below used
// to fall back to a nested per-tool list -- which is exactly why
// "Schedules"/"Releases"/"Advanced" all appeared as separate links
// under Settings, unintentionally. Fixed by inverting the mapping:
// each of the three groups now names its own single, specific,
// intentional tool by name (GROUP_TOOL_NAME below) -- any other tool
// Studio happens to register, now or in the future, is simply not
// looked up here and doesn't appear in this nav at all. It still
// exists in Studio; this component just doesn't link to it yet ("We'll
// determine where it leads later").
//
// Navigation-architecture pass ("one Archive application, four
// sections"): "Archive" used to look up a single `library`-named
// structureTool instance; it's now four separate Structure Tools (see
// archiveSections.js/sanity.config.js), so this link and its active-state
// check both changed. The link itself still only ever targets ONE tool --
// DEFAULT_ARCHIVE_TOOL_NAME ('archiveItems') -- so clicking "Archive"
// always lands Josh directly on Archive Items, never a blank chooser
// screen. Active-state detection is broader on purpose: see the isActive
// computation below, which treats *any* of the four Archive tools as
// "Archive is active," not just the one this link happens to target --
// otherwise the top nav would stop highlighting "Archive" the moment
// Josh is on Projects, Themes, or Photo Journal, which is exactly the
// "which underlying Structure Tool am I in" awareness this pass is
// meant to remove, not reintroduce.
//
// System rename pass: "Settings" renamed to "System". The underlying
// `advanced` Tool is not, and never was, a settings/configuration
// surface (no toggles or preferences live behind it) -- "System" reads
// as identification/information (what this CMS is, what it holds,
// where documentation will eventually live) instead of implying a
// place to change how Studio behaves. Scope matches the earlier
// Advanced -> Settings rename: only this display label changed, the
// underlying Tool object/route did not.
// About Page CMS milestone (reverted in the CMS-completion pass): a
// fourth top-nav group, "About," was briefly added here, giving About
// Page its own separate link alongside Import/Archive/System. That
// turned out to be the wrong placement -- Josh already reaches Photo
// Journal through the persistent Archive rail's "JOURNAL" cluster
// (UrbanumArchiveNav.jsx), not through a top-nav link of its own, so a
// brand-new top-nav entry was an easy place for About Page to go
// unnoticed. About Page is now a regular ARCHIVE_SECTIONS entry
// (`group: 'Journal'`, see archiveSections.js) and reached the exact same
// way Photo Journal already is: click "Archive" here, then "About Page"
// in the rail's JOURNAL group. This file goes back to exactly the three
// groups it had before that milestone -- no About-specific code left
// here at all.
const GROUP_ORDER = ['Import', 'Archive', 'System']

const GROUP_TOOL_NAME = {
  Import: 'urbanum-import',
  Archive: DEFAULT_ARCHIVE_TOOL_NAME,
  System: 'advanced',
}

// Matches ImportWorkspace.jsx's own palette (INK/MUTED_INK) so the nav
// reads as the same design system as the rest of the Studio, not a
// separately-styled piece -- duplicated as plain literals rather than
// imported, since the two components don't otherwise share a module and
// introducing one just for two color strings isn't worth it.
const NAV_INK = '#1a1a1a'
const NAV_MUTED_INK = '#9d9d9d'
const navLinkStyle = {
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: '0.72rem',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  paddingBottom: 6,
  borderBottom: '2px solid transparent',
}

export function UrbanumToolMenu(props) {
  // `tools`, `context`, `activeToolName`, and `closeSidebar` are all
  // provided directly on ToolMenuProps (confirmed via the installed
  // 6.7.0 type declarations) -- no need to read router state separately
  // for the active tool.
  const {tools, context, activeToolName, closeSidebar} = props
  const isSidebar = context === 'sidebar'

  // One link per group, always -- looked up by the group's own specific
  // tool name (GROUP_TOOL_NAME) rather than derived by scanning `tools`
  // for anything that isn't Import/Archive. `.filter(Boolean)` only
  // guards against a genuinely missing tool (e.g. `advanced` not yet
  // registered for some reason); it is not doing the grouping work --
  // that's the point of this rewrite.
  const groups = GROUP_ORDER.map((group) => ({
    group,
    tool: tools.find((tool) => tool.name === GROUP_TOOL_NAME[group]),
  })).filter((entry) => entry.tool)

  return (
    <Flex
      direction={isSidebar ? 'column' : 'row'}
      align="center"
      gap={6}
      padding={3}
    >
      {groups.map(({group, tool}) => {
        // "Archive" is active for any of its four underlying Structure
        // Tools, not just the one it links to (see the comment above
        // GROUP_ORDER) -- Import and System are still a plain 1:1
        // match, since each of those is genuinely only ever one tool.
        const isActive =
          group === 'Archive'
            ? ARCHIVE_TOOL_NAMES.includes(activeToolName)
            : activeToolName === tool.name

        return (
          <StateLink
            key={group}
            state={{tool: tool.name}}
            onClick={isSidebar ? closeSidebar : undefined}
            style={{
              ...navLinkStyle,
              color: isActive ? NAV_INK : NAV_MUTED_INK,
              fontWeight: isActive ? 600 : 500,
              borderBottomColor: isActive ? NAV_INK : 'transparent',
            }}
          >
            {group}
          </StateLink>
        )
      })}
    </Flex>
  )
}
