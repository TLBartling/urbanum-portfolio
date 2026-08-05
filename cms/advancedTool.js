import {CogIcon} from '@sanity/icons/Cog'
import {AdvancedPlaceholder} from './components/AdvancedPlaceholder'

// A standalone Studio Tool, same documented extension point as
// importWorkspaceTool.js (sanity.io/docs/studio/custom-studio-tool).
// Originally Milestone 2A's deliberately empty "Advanced" placeholder;
// the System redesign pass replaces that placeholder content with a
// real information page -- component now renders live portfolio
// counts, version/build identification, and a Documentation/Support
// section (see AdvancedPlaceholder.jsx for the full reasoning). This
// is still not a settings/configuration surface: no toggles,
// preferences, or editable options were introduced. Structure/Vision/
// plugins/dataset tooling can still land here in a later phase, per
// the original Milestone 2 assessment's phased plan -- nothing about
// that plan changed, only what currently occupies the tool while that
// later phase hasn't arrived yet.
//
// Deliberately NOT a second structureTool() instance -- see the
// Milestone 2A report for why: two structureTool()s exposing the same
// document types would make Sanity's 'edit' intent resolution ambiguous,
// which would risk breaking "Continue Editing" (ImportWorkspace.jsx) and
// the publish auto-advance (resolveDocumentActions.js). This tool shares
// no document types with any of the four Archive Structure Tools
// (archiveItems/projects/themes/photoJournal -- see archiveSections.js),
// so intent resolution is unaffected.
//
// System rename pass: title renamed from 'Advanced' to 'System',
// matching UrbanumToolMenu.jsx's own nav-label rename (see that file's
// comment). The name field ('advanced') -- the internal route segment,
// never shown as-is -- is deliberately left unchanged: renaming it
// would be a route change with no user-visible benefit, and risks
// anything that might reference this tool by its route name.
export const advancedTool = {
  name: 'advanced',
  title: 'System',
  icon: CogIcon,
  component: AdvancedPlaceholder,
}
