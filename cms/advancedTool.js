import {CogIcon} from '@sanity/icons/Cog'
import {AdvancedPlaceholder} from './components/AdvancedPlaceholder'

// A standalone Studio Tool, same documented extension point as
// importWorkspaceTool.js (sanity.io/docs/studio/custom-studio-tool).
// This is Milestone 2A's "Advanced" destination: a deliberately empty
// placeholder today. Nothing developer-facing has been moved behind it
// yet -- Structure/Vision/plugins/dataset tooling will land here in a
// later phase, per the Milestone 2 assessment's phased plan. Its only
// job right now is to exist as a real, separate Tool with its own name,
// so UrbanumToolMenu has a third group to render and the IMPORT/LIBRARY/
// ADVANCED hierarchy is real rather than aspirational.
//
// Deliberately NOT a second structureTool() instance -- see the
// Milestone 2A report for why: two structureTool()s exposing the same
// document types would make Sanity's 'edit' intent resolution ambiguous,
// which would risk breaking "Continue Editing" (ImportWorkspace.jsx) and
// the publish auto-advance (resolveDocumentActions.js). This tool shares
// no document types with any of the four Archive Structure Tools
// (archiveItems/projects/themes/photoJournal -- see archiveSections.js),
// so intent resolution is unaffected.
export const advancedTool = {
  name: 'advanced',
  title: 'Advanced',
  icon: CogIcon,
  component: AdvancedPlaceholder,
}
