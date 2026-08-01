import {UploadIcon} from '@sanity/icons/Upload'
import {ImportWorkspace} from './components/ImportWorkspace'

// A standalone Studio Tool, not a Structure Builder pane -- same
// documented extension point as before (see
// sanity.io/docs/studio/custom-studio-tool), just renamed to match this
// milestone's Import Workspace shift. `name` changed from 'urbanum-upload'
// to 'urbanum-import' along with everything else -- there is no published
// Studio in production yet for this to be a breaking URL change for, so
// renaming cleanly now (rather than keeping a stale internal id around
// "for compatibility") costs nothing.
//
// No `router` of its own, same as advancedTool.js: Import has no
// deep-linkable step/draft state, and nothing in this codebase ever
// targets this tool with anything beyond a plain `{tool: 'urbanum-import'}`
// (see UrbanumToolMenu.jsx's Import link) -- there's no state that would
// ever need one to resolve.
export const importWorkspaceTool = {
  name: 'urbanum-import',
  title: 'Urbanum Import',
  icon: UploadIcon,
  component: ImportWorkspace,
}
