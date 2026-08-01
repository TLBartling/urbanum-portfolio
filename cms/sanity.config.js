import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {archiveItemsStructure, projectsStructure, themesStructure, photoJournalStructure} from './structure'
import {ARCHIVE_SECTIONS} from './archiveSections'
import {StudioIcon} from './components/StudioIcon'
import {importWorkspaceTool} from './importWorkspaceTool'
import {advancedTool} from './advancedTool'
import {resolveDocumentActions} from './resolveDocumentActions'
import {resolveDocumentInspectors} from './resolveDocumentInspectors'
import {urbanumStructureStrings} from './urbanumStructureStrings'
import {urbanumStudioTheme} from './urbanumStudioTheme'
import {UrbanumToolMenu} from './components/UrbanumToolMenu'
import {UrbanumNavbar} from './components/UrbanumNavbar'
import {UrbanumArchiveLayout} from './components/UrbanumArchiveLayout'

// Vision (raw GROQ query testing) was removed from this Studio's plugins:
// it's a developer tool with no role in Josh's day-to-day publishing
// workflow -- see this milestone's report for the reasoning. If it's ever
// needed again for development/debugging, re-adding it is one import and
// one array entry, not a rebuild.

// Navigation-architecture pass ("one Archive application, four sections"):
// each entry in ARCHIVE_SECTIONS (archiveSections.js) needs its own named
// structure resolver -- Structure Builder only ever expects one root node
// per `structure` function, so "four independently-landable sections"
// means four separate resolvers, looked up here by the same `name` each
// section is keyed by everywhere else.
const STRUCTURE_BY_SECTION_NAME = {
  archiveItems: archiveItemsStructure,
  projects: projectsStructure,
  themes: themesStructure,
  photoJournal: photoJournalStructure,
}

export default defineConfig({
  name: 'default',
  title: 'Urbanum Studio',
  icon: StudioIcon,

  projectId: 'zxmuvik1',
  dataset: 'production',

  // Authentication pass ("Option A" -- see authentication-investigation.md
  // for the full investigation this implements). `auth` (the `AuthConfig`
  // shape) is fully `@public` in the installed 6.7.0 source
  // (node_modules/sanity/lib/index-Z0jxEn8U.d.ts:2823), confirmed a second
  // way against Sanity's own live docs, which show this exact
  // filter-the-providers-array pattern ("Custom authentication,"
  // sanity.io/docs/studio/custom-auth). Nothing here is a new API surface
  // this project hasn't already used elsewhere -- it's the same
  // already-established "`@hidden @beta` config field, verified against
  // the installed source rather than assumed" category as `theme`/
  // `studio.components`/`i18n` above and below, except `auth` itself
  // isn't even tagged `@beta`/`@hidden` at all.
  //
  // `providers`: Sanity's API returns three configured providers for this
  // project today (Google, GitHub, Sanity email/password -- confirmed by
  // fetching this project's own live provider list during investigation,
  // not assumed from the docs' generic example). Josh only uses Google;
  // filtering here to just the entry actually named `'google'` in that
  // live response (not a guessed string) removes the other two from ever
  // being offered.
  //
  // `redirectOnSingle`: per `AuthConfig`'s own doc comment
  // (index-Z0jxEn8U.d.ts:2833), with exactly one provider left, Sanity
  // skips its "choose a provider" screen entirely and redirects straight
  // to that provider's OAuth URL -- so a signed-out visit never shows any
  // Sanity-rendered screen at all, just an immediate bounce to Google and
  // back into the Studio on success. This is the documented mechanism the
  // investigation found for "branded login screen": not reskinning a
  // screen, removing it.
  auth: {
    providers: (prev) => prev.filter((provider) => provider.name === 'google'),
    redirectOnSingle: true,
  },

  // Unified Visual Theme, Priority 1 prototype -- see urbanumStudioTheme.js
  // for the full investigation (why `buildLegacyTheme` is the only
  // documented lever available, exactly what it does and doesn't reach,
  // and why only three seed values are set here). `theme` itself carries
  // the same `@hidden @beta` tag already investigated and normalized for
  // `studio.components` below (version lag against Sanity's live docs, not
  // a new internal-API risk) -- but note `buildLegacyTheme` additionally
  // carries `@deprecated`, which `studio.components` does not. This is a
  // deliberately small, isolated prototype for evaluating the visual
  // direction, not a commitment to the deprecated API long-term.
  theme: urbanumStudioTheme,

  // Navigation-architecture pass ("one Archive application, four
  // sections"): what used to be a single `structureTool({name: 'library',
  // ...})` wrapping a nested four-item menu is now four separate
  // structureTool() instances, one per ARCHIVE_SECTIONS entry -- each
  // rooted directly at `S.documentTypeList(schemaType)` (see structure.js).
  // This is Sanity's own documented pattern for "a Structure Tool scoped
  // to one document type" (`title`/`name`/`icon`/`structure` are all
  // `StructureToolOptions`, fully public, no @hidden/@beta tag), not a
  // workaround -- and it's the fix for a real, verified limitation: a
  // Structure Tool's own pane layout has no public way to keep an
  // ancestor pane from collapsing once enough panes are open (confirmed
  // against the installed 6.7.0 source; see the delivered investigation
  // notes). Splitting into four keeps every one of them at a maximum pane
  // depth of two, so that collapse behavior never triggers.
  //
  // None of these four appear in Sanity's own tool-switcher UI (Studio's
  // default one was already replaced by UrbanumToolMenu.jsx below, and
  // none of the four are added to GROUP_TOOL_NAME there) -- Josh reaches
  // them exclusively through the persistent rail (UrbanumArchiveNav.jsx),
  // wired in via `activeToolLayout` below, so the four-tool split stays an
  // implementation detail rather than something he has to navigate
  // around.
  //
  // 'edit'-intent resolution (which "Continue Editing" and publish
  // auto-advance both depend on) stays unambiguous: each of the four owns
  // exactly one, non-overlapping document type, the same constraint
  // advancedTool.js's own comment already documents for why *that* tool
  // isn't a second structureTool() instance.
  plugins: ARCHIVE_SECTIONS.map((section) =>
    structureTool({
      name: section.name,
      title: section.title,
      icon: section.icon,
      structure: STRUCTURE_BY_SECTION_NAME[section.name],
    }),
  ),

  // Prepends Urbanum Import to Studio's tool list and appends the new
  // Advanced placeholder tool (`prev` is the list contributed by
  // `plugins` above -- the four Archive Structure Tools, as of the
  // navigation-architecture pass). Import staying first is what makes it
  // the default landing tool, per Sanity's Tools docs -- unaffected by
  // Advanced being appended after them. Advanced is a wholly separate
  // Tool with no document types of its own (see advancedTool.js for why
  // it isn't a second structureTool() instance).
  tools: (prev) => [importWorkspaceTool, ...prev, advancedTool],

  // Milestone 2A groups the tools above under an IMPORT / ARCHIVE /
  // SETTINGS heading via `studio.components.toolMenu` (see
  // UrbanumToolMenu.jsx for the full API-stability reasoning; the nav
  // group labels themselves were renamed in later terminology passes --
  // 'Advanced' to 'Settings', then 'Library' to 'Archive' -- without
  // touching this wiring). As of the navigation-architecture pass,
  // "Archive" now maps to `archiveSections.js`'s DEFAULT_ARCHIVE_TOOL_NAME
  // rather than a single 'library' tool, and its active-state check
  // treats all four Archive tool names as "Archive is active" -- see that
  // file's own comment.
  //
  // Milestone 2B adds `navbar`: replaces Sanity's default chrome (logo,
  // search, workspace switcher, tool-overflow menu, user/account menu)
  // with a minimal Urbanum-branded bar (see UrbanumNavbar.jsx, including
  // the disclosed sign-out limitation). `layout` is still left at
  // Studio's default -- overriding it would mean rebuilding the navbar +
  // search-modal + error-boundary bundle it wraps as one opaque unit, for
  // no benefit this project needs. `activeToolLayout`, added in the
  // navigation-architecture pass, is a narrower, better-scoped slot:
  // checked directly against the installed source that it wraps only the
  // active tool's own content, below the navbar -- see
  // UrbanumArchiveLayout.jsx for the full reasoning. This remains
  // structural: no typography, spacing, color, or animation system is
  // introduced here.
  studio: {
    components: {
      toolMenu: UrbanumToolMenu,
      navbar: UrbanumNavbar,
      activeToolLayout: UrbanumArchiveLayout,
    },
  },

  // Documented `document.actions` config field (see
  // sanity.io/docs/document-actions) -- the only place Studio lets code
  // run in response to *this specific document*, and the same hook this
  // Studio already used for Publish's auto-advance behavior. Ellipsis-
  // menu cleanup pass ("document actions"): resolveDocumentActions.js now
  // also curates WHICH of Studio's six built-in actions are shown at all,
  // for Archive Item, Journal Entry, Project, and Theme -- see that
  // file's own comment for exactly what was kept/dropped and why. This is
  // keyed entirely by `context.schemaType`, independent of which
  // Structure Tool renders the document, so the navigation-architecture
  // pass's four-tool split leaves this completely unaffected. Every other
  // document type this Studio might ever register keeps Studio's stock,
  // unfiltered action list untouched.
  //
  // `document.inspectors` is the peer config field on this same plugin
  // options object (found during the Archive Number investigation: every
  // structureTool() plugin instance contributes its own default
  // inspectors -- History, Incoming References, and Validation -- and
  // this Studio never had an app-level resolver narrowing that down, the
  // same gap `document.actions` had before the document-actions pass).
  // resolveDocumentInspectors.js drops History and Incoming References
  // for the same four document types; see that file's own comment for
  // exactly what's configurable this way versus hardcoded elsewhere in
  // the document pane with no documented per-type opt-out at all.
  document: {
    actions: resolveDocumentActions,
    inspectors: resolveDocumentInspectors,
  },

  // Archive polish pass ("Empty states"): registers the one string override
  // urbanumStructureStrings.js defines -- see that file's own comment for
  // exactly which built-in string this replaces and why, and for the
  // `@hidden @beta` caveat on this `i18n` field itself (same category as
  // `studio.components` above, not a new kind of risk).
  i18n: {
    bundles: [urbanumStructureStrings],
  },

  schema: {
    types: schemaTypes,
  },
})
