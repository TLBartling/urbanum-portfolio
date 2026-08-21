import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient, useDocumentOperation, useDocumentOperationEvent, useWorkspace} from 'sanity'
import {useIntentLink, useRouter} from 'sanity/router'
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
  TextArea,
  TextInput,
} from '@sanity/ui'
import {UploadIcon} from '@sanity/icons/Upload'
import {uploadImportImage} from '../uploadImportImage'
import {createImportDrafts} from '../createImportDrafts'
import {patchImportDraft} from '../patchImportDraft'
import {DEFAULT_ARCHIVE_TOOL_NAME} from '../archiveSections'
import {AnnotationField} from './AnnotationField'

const API_VERSION = '2024-01-01'

// UX/UI redesign pass: a small, restrained palette borrowed from the
// Urbanum site itself (src/styles.css -- off-white background, near-black
// ink, muted gray for secondary text) so this Studio tool reads as part of
// the same publication rather than a generic CMS screen. Plain constants
// applied via inline `style` on top of @sanity/ui's own components -- not a
// new theming system, and nothing here changes what any component does,
// only how it looks. This pass is presentation-only: every state variable,
// handler, hook call, and mutation below is byte-for-byte the same logic
// that was already tested and confirmed working end to end; only the JSX
// that renders it changed.
const INK = '#1a1a1a'
const MUTED_INK = '#9d9d9d'
const HAIRLINE = 'rgba(17, 17, 17, 0.1)'

// Approved layout specification (mockup-driven, supersedes the earlier
// "two-zone room" model above this comment historically described): a
// permanent three-column composition -- LEFT SIDEBAR (persistent workflow
// navigation) | CENTER (the active workspace, content changes per step) |
// RIGHT SIDEBAR (persistent contextual rail: recovery, tips, the primary
// forward action). The outer shell (Container: full-browser fill, no
// width cap) is unchanged; only the composition inside it is. Widths
// below are fixed per the spec ("~260px" / "~300px"); CENTER is `flex: 1`
// and takes whatever's left.
const LEFT_SIDEBAR_WIDTH = 260
const RIGHT_SIDEBAR_WIDTH = 300
const IMAGE_FRAME_HEIGHT = 'min(74vh, 920px)'
// Final UX polish pass ("Responsive center column"): CENTER previously
// had `minWidth: 0` -- correct for "don't let flexbox's default
// content-based minimum stop it from shrinking," but with nothing to
// stop it from shrinking, it kept shrinking as the browser narrowed,
// with LEFT/RIGHT holding their full fixed widths the whole time --
// exactly the "uploader becomes a tall narrow strip" symptom reported.
// This is a real floor, not a content-based accident: below it, CENTER
// stops shrinking and the three-column Flex simply becomes wider than
// the viewport, which the Container's new `overflowX: 'auto'` (below)
// turns into an ordinary horizontal scrollbar rather than a squeeze.
// Sidebars are unaffected either way -- they were already fixed-width
// with `flexShrink: 0`.
// Round E ("Responsive Layout"): raised from 420 to 480 -- reported as
// still feeling unstable while resizing. 480 gives the upload dropzone
// (see its own `.urbanum-upload-card` padding, below) more room to
// breathe before the floor is reached, so the transition from "still
// shrinking" to "hit the floor, now scrolling horizontally" happens at
// a point where CENTER's content already looks comfortable rather than
// already cramped.
const CENTER_MIN_WIDTH = 480

// UI cohesion pass ("Responsive Uploader"): the shell's own horizontal
// edge padding and the gap between the three columns, previously inline
// literals in the JSX below (paddingLeft/paddingRight: 32, gap={7} --
// @sanity/ui's own space scale, confirmed against the installed 3.5.0
// package's theme: space[7] === 84) with no name of their own. Named
// here, alongside the sidebar/CENTER constants above, so the breakpoint
// math just below can be computed from them instead of a second set of
// duplicated numbers.
const SHELL_HORIZONTAL_PADDING = 32
const COLUMN_GAP = 84

// The exact point, computed rather than guessed, where the three-column
// row at its full-size padding/gap/sidebar widths stops fitting and the
// Container's `overflowX: 'auto'` (below) turns it into a horizontal
// scrollbar: LEFT + gap + CENTER's own floor + gap + RIGHT + padding on
// both sides. Everything at or above this width is required to look
// exactly as it does today -- this constant is also the first (widest)
// breakpoint below, so "above it, nothing changes" is structural, not
// just intended.
const OVERFLOW_THRESHOLD =
  LEFT_SIDEBAR_WIDTH + COLUMN_GAP + CENTER_MIN_WIDTH + COLUMN_GAP + RIGHT_SIDEBAR_WIDTH +
  SHELL_HORIZONTAL_PADDING * 2

// Compressed padding/gap values, applied below OVERFLOW_THRESHOLD in
// priority order -- padding first, then the column gap -- before anything
// structural changes. CENTER_MIN_WIDTH is deliberately never reduced by
// any of this: "preserve CENTER readability" is an explicit requirement
// this round, and Round E's own history above already documents that
// lowering this specific number in isolation (420) was reported as
// making the layout feel unstable while resizing.
const COMPRESSED_SHELL_HORIZONTAL_PADDING = 16
const COMPRESSED_COLUMN_GAP = 52

// Chained from the previous stage's own resulting floor, same method this
// file has used throughout: OVERFLOW_THRESHOLD (padding compressed) ->
// GAP_COMPRESSED_THRESHOLD (gap also compressed) -> WORKSPACE_STACK_THRESHOLD
// below (the structural change, once padding and gap alone can no longer
// keep the row fitting).
const GAP_COMPRESSED_THRESHOLD =
  LEFT_SIDEBAR_WIDTH + COLUMN_GAP + CENTER_MIN_WIDTH + COLUMN_GAP + RIGHT_SIDEBAR_WIDTH +
  COMPRESSED_SHELL_HORIZONTAL_PADDING * 2

// Prototype review pass ("Responsive Import Workspace," Priority 2, round
// 3 -- corrected hierarchy): round 2 read "the issue is architectural, not
// numerical" as "RIGHT SIDEBAR should reflow below LEFT + CENTER, full
// width." Local testing showed that got the hierarchy backwards -- LEFT
// SIDEBAR (Upload/Type/Required/Optional/Review & Publish) is persistent
// workflow navigation and should be the LAST thing to move, not a fixed
// point RIGHT reflows around while CENTER is left free to stretch
// (unbounded `flex: 1`) to whatever width happens to be left. What
// actually needs to adapt is CENTER (the uploader) and RIGHT (the
// Required/Optional metadata form) together, as one unit that can be
// side-by-side or stacked -- with LEFT staying exactly where it is either
// way.
//
// That unit is `.urbanum-workspace` below, a nested Flex wrapping CENTER
// and RIGHT, sitting beside LEFT in the outer row. At full desktop widths
// it's `flex-direction: row` with the same CENTER (`flex: 1`, floor
// CENTER_MIN_WIDTH) + RIGHT (fixed RIGHT_SIDEBAR_WIDTH) pairing as before
// -- nesting one level deeper doesn't change the arithmetic: the outer row
// still spends exactly LEFT + gap + CENTER + gap + RIGHT + padding, just
// with the middle gap now living inside the nested Flex instead of the
// outer one. Nothing above OVERFLOW_THRESHOLD is different from today.
//
// WORKSPACE_STACK_THRESHOLD is the same number this file has computed
// three times now for "the row, already spacing-compressed, stops
// fitting" (1176px) -- what changes below it is no longer a fixed-width
// shrink, it's `.urbanum-workspace` switching to `flex-direction: column`
// (uploader on top, metadata directly beneath it) with its own
// `max-width: CENTER_MIN_WIDTH`. That cap is the direct fix for what the
// screenshot showed: CENTER's `flex: 1` has no ceiling today, so once
// RIGHT reflowed out of its row (round 2), CENTER -- and RIGHT, matching
// it -- stretched to fill whatever was left, reading as loose and
// disconnected rather than "the uploader's own width." Reusing
// CENTER_MIN_WIDTH as the cap, not a new number, means the stacked
// column is exactly as wide as CENTER already renders at the one moment
// this matters -- right at the threshold, where CENTER is already pinned
// to its own floor -- and RIGHT now matches it exactly (both become
// `width: 100%` of the same capped parent) instead of picking its own
// separate width. LEFT is untouched at this stage, per "the left workflow
// column should remain fixed... for as long as reasonably possible."
const WORKSPACE_STACK_THRESHOLD =
  LEFT_SIDEBAR_WIDTH + COMPRESSED_COLUMN_GAP + CENTER_MIN_WIDTH + COMPRESSED_COLUMN_GAP +
  RIGHT_SIDEBAR_WIDTH + COMPRESSED_SHELL_HORIZONTAL_PADDING * 2

// The gap between the stacked uploader and metadata panel, once
// `.urbanum-workspace` is column-direction -- deliberately tighter than
// COMPRESSED_COLUMN_GAP (52), which spaced two independent columns apart;
// "the metadata panel stacked directly underneath the uploader" reads as
// one workspace, not two columns turned sideways. @sanity/ui's own
// space[5] (confirmed against the installed 3.5.0 theme, same scale
// COLUMN_GAP/COMPRESSED_COLUMN_GAP already source their values from).
const WORKSPACE_STACK_GAP = 32

// The genuine last resort -- "only if the viewport becomes genuinely too
// narrow should the left workflow column collapse... last adaptation, not
// first." Below this, LEFT + gap + the stacked workspace's own floor
// (CENTER_MIN_WIDTH, never reduced, same as always) no longer fit
// side by side even after stacking has already done everything it can.
// Reuses the same 220px LEFT SIDEBAR trim this file already computed and
// disclosed once before (round 2's now-removed fourth stage) -- a modest,
// already-considered value, not a new redesign of LEFT itself (icon-only
// rail, drawer, etc.) -- because the width this actually resolves to,
// 824px, is narrower than any realistic desktop browser window; a fuller
// treatment of LEFT is worth its own round only if that ever proves wrong
// in practice. Below this stage's own resulting floor (784px), the
// Container's `overflowX: 'auto'` remains the documented last-resort
// fallback, same as it always has been.
const COMPRESSED_LEFT_SIDEBAR_WIDTH = 220
const LEFT_COMPRESS_THRESHOLD =
  LEFT_SIDEBAR_WIDTH + COMPRESSED_COLUMN_GAP + CENTER_MIN_WIDTH + COMPRESSED_SHELL_HORIZONTAL_PADDING * 2

// A small, shared design vocabulary instead of continuing to duplicate the
// same inline style objects at every field label, button, and section
// heading. Still plain objects and a few tiny local components below, not
// a new design system or a new file -- ImportWorkspace.jsx stays one file,
// per the locked architecture.
const kickerStyle = {
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  fontWeight: 500,
  color: MUTED_INK,
  fontSize: '0.68rem',
}
// lineHeight added (UI polish pass, "Choose Type heading"): the RIGHT
// SIDEBAR step headings (Choose Type/Required Information/Optional
// Information/Review & Publish, and Step 1's own heading in CENTER --
// both share this same style) had no explicit line-height at all,
// which read as too tight whenever one wrapped to two lines. 1.25
// matches the typography rhythm already established for this shell's
// subheadings (mutedTextStyle + lineHeight: 1.5 below them), just
// tighter, as a Heading should be relative to body text -- font size
// and weight are unchanged.
const titleStyle = {fontWeight: 300, letterSpacing: '-0.01em', color: INK, lineHeight: 1.25}
// Phase 3, Milestone 4: sized down slightly (no explicit fontSize before,
// which meant these rendered at Text's own default size -- heavier than
// intended once the photo is meant to be the loudest thing on screen).
// This is the base weight Required's Project/Theme labels still use;
// Optional's labels layer quietFieldLabelStyle on top of this for an even
// quieter second step, so the two remain visibly distinct, just both a
// little lighter than before.
const fieldLabelStyle = {
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 400,
  color: MUTED_INK,
  fontSize: '0.7rem',
}
const sectionHeadingStyle = {
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 500,
  color: INK,
  fontSize: '0.72rem',
}
const mutedTextStyle = {color: MUTED_INK}
// Final polish pass ("Archive editor validation styling"): this used to
// read the shared '--card-critical-fg-color' theme token, which
// urbanumStudioTheme.js's own '--state-danger-color' seed now
// deliberately softens to a neutral gray (see that file's comment) so
// idle/untouched required-field validation -- an empty Theme reference
// the instant it's added, before Josh has done anything -- no longer
// reads as aggressively red. This text is a different concern: real
// save/publish-failure copy ("Could not save -- try Continue again.",
// "Failed to delete cancelled draft(s).", etc.) after an operation has
// actually failed, not a field that's merely empty. Hardcoded to the
// exact hex the shared token resolved to before that change (computed
// directly from the installed buildLegacyTheme() output, not guessed),
// so this stays visibly red and unaffected by the field-validation
// softening -- a real failure should still read as urgent.
const errorTextStyle = {color: '#44221f', textAlign: 'center'}
const primaryButtonStyle = {textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500}
const secondaryButtonStyle = {textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400}
// Visual-language pass: replacing every remaining `tone="primary"` (Sanity's
// stock theme blue -- confirmed via sanity.config.js that nothing here
// overrides it, so `tone="primary"` has always rendered literally as
// Sanity's own default blue, not a deliberate accent of this tool's own).
// `solidActionStyle` is the one truly emphasized action per screen
// (Continue, Publish) -- a solid ink pill, not a ghost/ ​bleed button tinted
// blue. `selectedChipStyle` is the lighter, more frequent "this is
// currently attached/selected" accent (Recent pills, Display Role) -- an
// ink-tinted wash at the same opacity HAIRLINE already uses elsewhere in
// this file, not a new color introduced just for this.
const solidActionStyle = {backgroundColor: INK, color: '#faf9f5', border: 'none'}
const selectedChipStyle = {backgroundColor: 'rgba(17, 17, 17, 0.08)', color: INK}
// Final UX polish pass ("Restore the Resume Editing button style"): a
// light, inverse companion to solidActionStyle -- reviewed in context
// and judged wrong to make Resume Editing match Continue/Publish/
// Archive Item/Journal Entry, since it's a secondary utility action
// (recovering an old draft), not the primary action of the step
// currently on screen. Same pill shape/weight as the dark buttons
// (still built on primaryButtonStyle), just background/ink swapped,
// plus a hairline border a white-on-#faf9f5 button needs to read as a
// distinct control at all. Continue/Publish/Archive Item/Journal Entry
// all stay on solidActionStyle, untouched -- this is used by Resume
// Editing only.
const inverseActionStyle = {backgroundColor: '#ffffff', color: INK, border: `1px solid ${HAIRLINE}`}
// Round E ("Continue Previous button legibility"): the button above --
// @sanity/ui's own <Button> -- correctly picked up the new background
// (backgroundColor is set directly on Button's own root element, which
// wins by ordinary CSS specificity), but the label text stayed
// effectively invisible. Investigated directly rather than guessed
// again: @sanity/ui's Button renders its `text` in its own inner Text
// element, which sets its own `color` independently of whatever
// `style.color` is passed to the outer Button -- there is no public,
// documented way to reach that inner color through Button's own props.
// Rather than fight that a second time, Resume Editing is a plain
// native <button> below -- same visual treatment (inverseActionStyle +
// primaryButtonStyle's type treatment), but with every pixel of color
// under this file's own control, the same reasoning navLinkButtonStyle
// (View Archive's own native <button>, defined just below) already
// uses for the same class of problem.
const inverseButtonStyle = {
  ...primaryButtonStyle,
  ...inverseActionStyle,
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 17px',
  borderRadius: 2,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.8125rem',
}
// Final UX polish pass ("Completion screen"): originally styled a
// `StateLink` (sanity/router) to look like a button, since StateLink has
// no button chrome of its own. "View Archive" below is now a plain
// native <button> instead (see the router-scoping comment at that call
// site for why), but this box styling -- padding/border/radius/display,
// matching inverseActionStyle's look -- reads the same either way, so
// the same style object still applies. Used only by "View Archive"
// below.
const navLinkButtonStyle = {
  ...primaryButtonStyle,
  ...inverseActionStyle,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 17px',
  borderRadius: 2,
  textDecoration: 'none',
}

// Phase 3, "annotations, not form fields" milestone. Everything above
// this point (labels, headings, buttons) already got an editorial pass
// early in this project -- what never got touched, until now, was the
// actual input controls themselves. Every TextInput/TextArea/Select in
// Required/Optional was still rendering @sanity/ui's stock boxed,
// bordered, shadowed input chrome -- exactly the "generic desktop form
// control" feeling this milestone asks to remove, and arguably the
// single biggest remaining tell that this screen was a form. `style` is
// already proven safe to pass to these components elsewhere in this file
// (the Region 1 upload Card already overrides border/background this
// way); `radius`/`border`/`padding`/`fontSize` are confirmed `@public`
// props on TextArea and Select in the installed @sanity/ui 6.7.0 types
// (checked directly, not assumed) and TextInput shares the same
// component family, so the same approach is used uniformly here.
//
// `quietFieldStyle`: the baseline -- no box, no shadow, no radius, just
// a single hairline underneath, the same visual weight as the hairline
// dividers already used throughout this shell. Darkening that line on
// focus can't be expressed through an inline `style` object (no `:focus`
// in React inline styles), so that part is handled by the `.urbanum-
// field:focus` rule added to the <style> block further down instead --
// the same reasoning `urbanumStepIn`'s keyframes already relied on.
const quietFieldStyle = {
  border: 'none',
  borderBottom: `1px solid ${HAIRLINE}`,
  borderRadius: 0,
  backgroundColor: 'transparent',
  boxShadow: 'none',
  paddingLeft: 0,
  paddingRight: 0,
}
// Description reads as a caption sitting under the photo, not a form
// field to fill in -- no visible input chrome at all, and no FieldLabel
// above it either (see the Optional region below); the placeholder text
// does that job instead, the way a real caption field would.
const captionFieldStyle = {...quietFieldStyle, fontStyle: 'italic'}
// The quietest control on the whole screen, on purpose -- Internal Notes
// are "personal notes to yourself," per the brief, not part of the
// record the way everything else here is. Smaller, more muted, and set
// apart with a soft dashed rule instead of the solid hairline everything
// else uses, so it visibly reads as a private aside even at a glance.
const noteFieldStyle = {
  ...quietFieldStyle,
  borderBottom: `1px dashed ${HAIRLINE}`,
  color: MUTED_INK,
  fontSize: '0.85rem',
}
// A quieter variant of fieldLabelStyle for Optional's Story/Display
// fields -- Required's Project/Theme labels stay at the original
// weight (they're still the heaviest metadata on the screen, just much
// lighter than the photo itself); Optional's should read as "even
// quieter," per the brief, not identical.
const quietFieldLabelStyle = {...fieldLabelStyle, fontSize: '0.62rem', letterSpacing: '0.08em'}
// For short explanatory asides under a field (the Year/Exact Date
// hint, the "no Projects/Themes exist yet" empty states) -- smaller
// than mutedTextStyle's default size, so a clarifying sentence doesn't
// carry the same visual weight as the field it's explaining.
const hintTextStyle = {...mutedTextStyle, fontSize: '0.68rem'}

// UI polish pass ("Disable browser autofill"): spread onto every
// Required/Optional TextInput/TextArea below. This only tells the
// browser/OS itself not to offer its own saved Contacts/addresses/
// previously-typed values on these fields -- it has nothing to do
// with, and doesn't touch, this workspace's own Project/Theme
// archive suggestions (AnnotationField's own React-rendered dropdown,
// see that file), which keep working exactly as they do today. `off`
// is the standards-track value and is reliably honored by Chrome/
// Safari outside of login/payment forms, which none of these are; the
// two `data-*-ignore` attributes are the well-known, inert-if-absent
// hints LastPass/1Password check for before offering their own
// overlay, on top of the browser's own autofill.
const noBrowserAutofillProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
}

// Every Required/Optional field heading uses this same family of
// treatment (small, uppercase, letter-spaced, muted) -- `quiet` selects
// the softer variant added for Phase 3's "annotations, not form fields"
// milestone, so Optional's labels can read as genuinely quieter than
// Required's rather than visually identical to them.
function FieldLabel({children, quiet}) {
  return (
    <Text size={1} style={quiet ? quietFieldLabelStyle : fieldLabelStyle}>
      {children}
    </Text>
  )
}

// A slightly stronger, ink-colored label used to group related fields
// (Optional's Story/Display/Notes clusters) -- distinct from FieldLabel so
// a group heading and a single field's own label never look identical.
function SectionHeading({children}) {
  return (
    <Text size={1} style={sectionHeadingStyle}>
      {children}
    </Text>
  )
}

// The photo itself -- the redesign's answer to "the user should always
// feel connected to the image they're describing." Two changes below are
// load-bearing, not cosmetic:
//
// 1. Under the approved three-column mockup, ImagePanel now renders
//    directly inside the CENTER column (the same `flex: 1` column
//    Required/Optional's fields render in below it), not a dedicated
//    fixed-width LEFT zone the way the earlier two-zone "room" model had
//    it. `width: '100%'` still simply fills whatever width CENTER is
//    handed -- this only makes ImagePanel correct inside that width, not
//    a claim about how wide CENTER itself is.
//
// 2. The frame used to force every photo into a fixed 4:5 crop via
//    `aspectRatio: '4 / 5'` + `objectFit: 'cover'` -- meaning a landscape
//    photo (very plausible for an architecture archive) had part of its
//    actual content silently cropped off just to fill a portrait-shaped
//    box. That's a direct hit against "I should feel like I'm looking at
//    a photograph": Josh wasn't looking at his actual photograph, he was
//    looking at however much of it happened to survive a crop nobody
//    asked for. The frame now has a fixed, generous HEIGHT
//    (IMAGE_FRAME_HEIGHT -- large, but bounded so the layout stays stable
//    across a very tall photo and a very wide one alike) and uses
//    `objectFit: 'contain'`, so the real photo, in its actual shape, is
//    always shown in full, letterboxed against the same quiet off-white
//    fill already used everywhere else in this shell -- never cropped.
//
// Still renders a quiet placeholder frame even when `url` is missing, so
// the two-column layout never collapses unexpectedly.
//
// Phase 3, Milestone 4 ("photo-first hierarchy"): the hard `1px solid`
// frame border from Milestone 2 is worth questioning here, per this
// milestone's own "keep questioning previous decisions" instruction --
// a drawn line around the photograph is a container-chrome cue (the kind
// of thing a form draws around an input, or a CMS draws around a media
// slot), not something a real photo-editing surface does. Lightroom,
// Capture One, and the front-end site itself (src/styles.css's own
// `box-shadow: 0 24px 90px rgba(24,28,34,0.12)` treatment on real
// photography) all separate the image from its background with soft
// ambient shadow instead of a stroked edge. Swapped below: same quiet
// off-white letterboxing fill, now with a soft shadow standing in for the
// border -- "whitespace instead of borders," applied to the one element
// on this screen a border was hardest to justify on.
function ImagePanel({url, caption}) {
  return (
    <Box style={{width: '100%'}}>
      <Box
        style={{
          width: '100%',
          height: IMAGE_FRAME_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(17, 17, 17, 0.04)',
          boxShadow: '0 24px 70px rgba(24, 28, 34, 0.12)',
        }}
      >
        {url && (
          <img
            src={url}
            alt=""
            style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block'}}
          />
        )}
      </Box>
      {caption && (
        <Text size={1} style={{...mutedTextStyle, textAlign: 'center', marginTop: 12}}>
          {caption}
        </Text>
      )}
    </Box>
  )
}

// The steps in their fixed, linear order -- used only to render the
// progress indicator in Region 0 below. Purely presentational: it reads
// `step` (or, while a publish is in flight, the nominal 'publish' key --
// see currentStepIndex below) to figure out where Josh is; it never drives
// navigation itself. There is no real `step` value of 'publish' -- Publish
// is a button at the bottom of the Optional screen, not its own screen --
// the indicator borrows the key only to show "Publish" as current for the
// moment a publish is actually running. Journal Entry's own path skips
// 'required' entirely (see handleChooseType), so for that document type
// this indicator will show Required as already "passed" even though it was
// never actually shown -- a disclosed simplification, not a bug.
// Labels updated to match the approved mockup's left-sidebar workflow
// list verbatim ("01 Upload Photos" ... "05 Review & Publish") -- same
// five keys, same STEP_SEQUENCE this file already used to drive the old
// horizontal step counter, now driving the persistent left-sidebar list
// instead. No new data shape.
const STEP_SEQUENCE = [
  {key: 'upload', label: 'Upload Photos'},
  {key: 'archiveOrJournal', label: 'Type'},
  {key: 'required', label: 'Required'},
  {key: 'optional', label: 'Optional'},
  {key: 'publish', label: 'Review & Publish'},
]

// Phase 5 ("session memory"): what the batch remembers between one photo
// and the next. Deliberately a single plain object rather than several
// separate state variables -- everything in it is written at one moment
// (a photo just finished) and cleared at one moment (the batch is over),
// so keeping it as one object means those two moments are each a single
// call, not several that could drift out of sync with each other.
//
// `recentThemeIds` holds only bare identifiers (a Theme's
// _id), never titles -- titles are looked up against
// availableThemes at the point this context gets applied to a new photo,
// the same derivation AnnotationField's own `items`/`suggestions` props
// already use elsewhere in this file. Storing anything more than the id
// here would be a second copy of data Sanity already gave us once.
//
// `lastSortOrder` stores the literal last value used, nothing more --
// deciding to add one to it is a decision made where this context gets
// *applied* to a new photo, not a fact baked into what's remembered here.
const RECENT_LIMIT = 6
const EMPTY_SESSION_CONTEXT = {
  project: null,
  recentThemeIds: [],
  location: '',
  year: '',
  fullDate: '',
  administrativeExpanded: false,
  lastSortOrder: '',
}

// Used by Theme's recent-list updates -- a plain array of string
// identifiers at this level (a Theme _id). `newest` wins position at the front; ties
// (something reappearing) keep only their frontmost occurrence, so using
// the same Theme again doesn't push it further back or duplicate it.
function dedupeRecentIds(newest, older, limit) {
  const seen = new Set()
  const result = []
  for (const id of [...newest, ...older]) {
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
    if (result.length >= limit) break
  }
  return result
}

// UI polish pass ("Improve Location consistency"): Location has no
// suggestion source of its own (unlike Project/Theme), so it's the
// one metadata field that's only ever free text -- "Miami, FL" next to
// "miami, florida" next to "Miami Florida" for the same place. A real
// place-suggestion service (the brief's preferred option) would mean a
// new external dependency, an API key, and a network call this
// workspace has never needed anywhere else -- too heavy for what's
// asked to stay a small polish pass, so this is the documented
// fallback: light, dependency-free normalization of the "City, State"
// shape those examples show.
//
// Deliberately narrow, not a geocoder: only touches values that already
// look like "<city>, <state>" (a plain lastIndexOf(',') split) --
// resolves the state half against the 50 states + DC, either a full
// name ("Florida") or an abbreviation in any case ("fl"), to its
// standard two-letter form. The city half is never re-cased -- auto-
// capitalizing proper nouns correctly (McAllen, LaGrange, DeKalb...) is
// its own hard problem, and getting it wrong would be a worse outcome
// than leaving whatever the person actually typed alone. Anything
// without a comma, or whose second half isn't a recognized US state
// (a country, a neighborhood, a typo), is returned completely
// untouched rather than guessed at -- silently mangling an unusual but
// correct value would be worse than leaving an inconsistent one.
//
// Only ever called from handleSaveOptional, at the moment a NEW value
// is about to be saved -- nothing here ever runs against, or rewrites,
// already-published documents. Existing Location values already in the
// archive keep whatever format they were saved with; standardizing
// those would be a deliberate backfill/migration, not "normalize newly
// entered values," and isn't part of this change.
const US_STATE_ABBREVIATIONS_BY_NAME = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
}
const US_STATE_ABBREVIATIONS = new Set(Object.values(US_STATE_ABBREVIATIONS_BY_NAME))

function normalizeLocation(rawValue) {
  const trimmed = (rawValue || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return trimmed

  const commaIndex = trimmed.lastIndexOf(',')
  if (commaIndex === -1) return trimmed

  const city = trimmed.slice(0, commaIndex).trim()
  const statePart = trimmed.slice(commaIndex + 1).trim()
  if (!city || !statePart) return trimmed

  // Periods stripped before the abbreviation check too, not just the
  // full-name lookup -- so "D.C." (a common way to type Washington's
  // state half) matches the same as "DC" would, rather than falling
  // through untouched just because of punctuation.
  const statePartNoPeriods = statePart.replace(/\./g, '')
  const stateKey = statePartNoPeriods.toLowerCase()
  let abbreviation = null
  if (statePartNoPeriods.length === 2 && US_STATE_ABBREVIATIONS.has(statePartNoPeriods.toUpperCase())) {
    abbreviation = statePartNoPeriods.toUpperCase()
  } else if (US_STATE_ABBREVIATIONS_BY_NAME[stateKey]) {
    abbreviation = US_STATE_ABBREVIATIONS_BY_NAME[stateKey]
  }
  if (!abbreviation) return trimmed

  return `${city}, ${abbreviation}`
}

// Finds every draft this tool itself created that Josh hasn't finished
// (published) yet. Matched by id namespace ("drafts.urbanum-import-...",
// see createImportDrafts.js), not by which fields are filled in --
// "still a draft" and "still needs attention" are the same condition
// here, since publishing removes the `drafts.` id entirely. Nothing
// needs to be marked "done": the moment Josh publishes one, it simply
// stops matching, with no separate bookkeeping to keep in sync.
// Exported so resolveDocumentActions.js can reuse the exact same query --
// one namespace, one query string, one place that knows what "an
// unfinished import draft" means, rather than that knowledge drifting into
// two files independently.
export const PENDING_DRAFTS_QUERY =
  '*[_id match "drafts.urbanum-import-*" && _type in ["archiveItem", "journalEntry"]] | order(_createdAt asc) {_id, _type}'

// Urbanum Import -- this milestone solves one specific problem: once a
// batch of images becomes drafts and the first one opens, the rest were
// previously invisible -- real documents in Sanity with no way back to
// them from this tool. The fix is NOT a second queue or a client-side
// list that tries to survive the hard page navigation the Intent handoff
// already performs (that in-memory state is gone the moment
// window.location.assign fires, on purpose -- see below). Instead,
// PENDING_DRAFTS_QUERY re-derives "what's left to finish" from Sanity
// itself, every time this component mounts -- which, per Studio's own
// Tool-switching behavior, is exactly what happens whenever Josh
// navigates back to Urbanum Import, hard reload or not. That's the
// answer to "how do we detect the user has returned": we don't detect an
// event, we just read real state from the one source of truth on every
// mount, the same way this tool already treats Sanity as authoritative
// for everything else.
//
// THE QUEUE (`queueItems`) IS UNCHANGED -- still the in-memory,
// per-session record of what's being uploaded and typed *right now*.
// `pendingDrafts` is a separate concern: drafts from a *previous* session
// that are still unfinished. The two never merge; a draft graduates from
// "just created" (tracked briefly in `queueItems` via `draftId`) to
// "pending" (found by PENDING_DRAFTS_QUERY on some future mount) without
// this file ever having to hand one off to the other.
export function ImportWorkspace() {
  // ImportWorkspace always renders inside Studio's own
  // <RouteScope scope="urbanum-import"> wrapper (every tool's content is
  // scoped this way). Any state handed to useRouter()/useStateLink()
  // from in here gets nested under this tool's own key before
  // resolving -- `{tool: 'archiveItems'}` becomes `{tool: 'urbanum-import',
  // 'urbanum-import': {tool: 'archiveItems'}}`, which the router can't map
  // to a URL. `router.navigateUrl({path})` is the one router method
  // RouteScope doesn't re-scope, so it's the correct way to link to a
  // different tool from inside this component (see the "View Archive"
  // button below) -- the same mechanism Sanity's own WorkspaceLoader
  // uses for its legacy-desk redirect. UrbanumToolMenu.jsx's own tool
  // links don't need this: they render from the Navbar slot, a sibling
  // of the active tool's content, outside RouteScope entirely.
  const router = useRouter()
  const {basePath} = useWorkspace()
  const client = useClient({apiVersion: API_VERSION})
  const [queueItems, setQueueItems] = useState([])
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false)
  // Visual-polish pass ("Archive/Journal buttons"): `isCreatingDrafts` is
  // shared by both choices (it gates a single in-flight handleChooseType
  // call, correctly), so both buttons showed "Creating..." together --
  // only whichever one was actually clicked should. This just remembers
  // which docType the click was for, purely for that label; the disabled
  // state below is intentionally unchanged (both buttons still lock while
  // either is in flight, since only one draft-creation call can run at a
  // time). Cleared on the next attempt (see handleChooseType's own
  // onClick wiring below), so a later click always reflects reality.
  const [pendingChooseType, setPendingChooseType] = useState(null)
  const [navigationTarget, setNavigationTarget] = useState(null)
  const [draftCreationError, setDraftCreationError] = useState(null)
  // null = not checked yet; array (possibly empty) once the query resolves.
  const [pendingDrafts, setPendingDrafts] = useState(null)
  const fileInputRef = useRef(null)

  // Computed up here (rather than just before the return, as before) so
  // the step-sync effect below can depend on it. Meaning is unchanged:
  // "at least one photo in this session has finished uploading."
  const hasUploadedItems = queueItems.some((item) => item.status === 'uploaded')

  // An explicit step concept -- Upload / Archive or Journal / Required /
  // Optional / Complete, per the locked product terminology (never
  // "Capture"/"Enrich"). Publish itself is a button at the bottom of the
  // Optional screen, not a distinct step value -- there is no separate
  // Review step; it added a screen without adding enough value to justify
  // it, so it was removed and Optional now ends in Publish directly.
  const [step, setStep] = useState('upload')

  // Keeps `step` perfectly in sync with `hasUploadedItems`. Once Required
  // exists, advancing past 'archiveOrJournal' becomes an explicit action
  // (choosing Archive Item or Journal Entry) rather than something this
  // effect decides on its own -- this effect's job then narrows to just
  // the upload/archiveOrJournal boundary it already covers here.
  useEffect(() => {
    setStep(hasUploadedItems ? 'archiveOrJournal' : 'upload')
  }, [hasUploadedItems])

  // `currentDraft` is deliberately singular -- it tracks the one draft the
  // Required/Optional screens are currently showing. `draftQueue`/
  // `draftQueueIndex` below cycle `currentDraft` through an entire batch,
  // one photo at a time, instead of only ever handling the first.
  const [currentDraft, setCurrentDraft] = useState(null)
  const [requiredProject, setRequiredProject] = useState(null)
  const [requiredThemeIds, setRequiredThemeIds] = useState([])
  // Phase 5: a frozen-per-photo snapshot of "Recent in this batch" --
  // deliberately NOT derived live from sessionContext minus whatever's
  // currently attached. A live "minus attached" computation would mean
  // this row shrinks the instant something's tapped from it, which is
  // exactly the rebuilding-while-you-work this was designed to avoid --
  // the brief was explicit that tapping Materiality shouldn't make
  // Materiality disappear from the row, since someone may still be
  // about to tap two more. So these are set once, when a photo opens
  // (see applySessionContext below), and never touched again until the
  // next one -- the same "seeded once, stable until the next photo"
  // treatment every other per-draft field already gets.
  const [recentThemeSuggestions, setRecentThemeSuggestions] = useState([])
  // null = not fetched yet (AnnotationField has nothing to suggest from
  // until then); array (possibly empty) once each query resolves. Not
  // reset between photos in a batch (see goToNextDraftOrComplete) --
  // Projects and Themes are the same two suggestion sources for
  // every Archive Item in this session, not per-draft data. Same
  // fetch-once-per-session shape as the other one, just a
  // distinct-values query instead of a document-type query (see the
  // fetch effect below).
  const [availableProjects, setAvailableProjects] = useState(null)
  const [availableThemes, setAvailableThemes] = useState(null)
  // Type CMS authoring pass: same null-until-fetched/array-once-resolved
  // shape as availableProjects/availableThemes immediately above -- see
  // the fetch effect below for where this is populated.
  const [availableTypes, setAvailableTypes] = useState(null)
  const [isSavingRequired, setIsSavingRequired] = useState(false)
  // Cancel Import Cleanup: true only while handleCancelImport's own
  // draft-delete transaction is in flight -- see that callback below.
  // Gates both Cancel Import buttons (Required and Journal Entry's
  // Optional step) and their paired primary action, the same
  // disable-the-pair-while-in-flight pattern isSavingRequired/
  // isSavingOptional already establish for their own steps.
  const [isCancellingImport, setIsCancellingImport] = useState(false)
  const [requiredSaveError, setRequiredSaveError] = useState(null)
  // Phase 4 ("progressive disclosure"): Featured, Sort Order, and Internal
  // Notes are operational, not descriptive -- per the brief, they stay
  // out of the way until intentionally expanded. Starts false on every
  // photo (reset in resetDraftFields below), the same way the rest of
  // this milestone's reveals restart from nothing on every photo: opening
  // a new photograph is a fresh "what is this" moment, not a continuation
  // of whatever was expanded on the last one.
  const [showAdministrative, setShowAdministrative] = useState(false)
  // Set only when the Projects/Themes fetch below fails outright --
  // distinct from requiredSaveError (a failed *save*). Surfaced so a
  // network hiccup doesn't leave Required silently stuck on an infinite
  // loading spinner with Continue permanently disabled and no explanation.
  const [requiredLoadError, setRequiredLoadError] = useState(null)

  // Milestone 5 ("one interaction language"): Project and Theme no longer
  // have a separate "+ New" mini-form -- AnnotationField (see
  // components/AnnotationField.jsx) owns the single text input, the typed
  // query, and the choice between attaching an existing item and creating
  // a new one. What's left here is only what happens *after* that choice
  // is made: whether a create is currently in flight, and whether it
  // failed. handleCreateProject/handleCreateTheme below still do the
  // actual client.create() work and the same existing-title dedupe they
  // always did -- only how they're triggered changed.
  const [isSavingNewProject, setIsSavingNewProject] = useState(false)
  const [newProjectError, setNewProjectError] = useState(null)
  const [isSavingNewTheme, setIsSavingNewTheme] = useState(false)
  const [newThemeError, setNewThemeError] = useState(null)
  // Type CMS authoring pass: same shape as isSavingNewTheme/newThemeError
  // immediately above -- handleCreateType below is the Type-flavored twin
  // of handleCreateTheme, triggered the same way, through AnnotationField's
  // own onCreate callback rather than a separate mini-form.
  const [isSavingNewType, setIsSavingNewType] = useState(false)
  const [newTypeError, setNewTypeError] = useState(null)

  // UX pass ("New Project workflow"): true only for the "just created a
  // brand-new Project document" branch of handleCreateProject below --
  // false when an existing Project was attached from suggestions, or
  // reused by an existing-title match in handleCreateProject. Drives
  // whether the New Project section (Location/Project Date) renders at
  // all; those two fields are plain local state, held here rather than
  // written immediately, and committed onto the just-created Project
  // document only at the same publish boundary every other field on this
  // screen already commits through (see handleSaveOptional). Never set
  // true for an existing Project -- existing Project documents are never
  // modified by this screen.
  const [isNewProject, setIsNewProject] = useState(false)
  const [newProjectLocation, setNewProjectLocation] = useState('')
  const [newProjectDate, setNewProjectDate] = useState('')
  // Type lives on Project (cms/schemaTypes/projectType.js's own
  // `projectType` field), not on the Archive Item draft -- but unlike
  // Location/Year immediately above (genuinely creation-only, per
  // isNewProject's own comment), Type is surfaced and editable in
  // Required Information for every Project, new or existing (see the
  // Type field's own comment in the JSX below for why: it originally
  // rendered only inside the isNewProject section, which is what made it
  // invisible for the common case of attaching an existing Project --
  // this was fixed by giving it its own always-visible block). So
  // `requiredType` is reset on the same schedule as every other per-draft
  // Required field (see resetDraftFields), but is no longer scoped to
  // isNewProject the way newProjectLocation/newProjectDate still are --
  // it's re-seeded from whatever the attached Project already has by the
  // Project field's own onAttach, handleCreateProject's existing-title
  // match, and applySessionContext (all below), so it correctly reflects
  // an existing Project's current Type rather than always starting
  // blank. Holds a plain {id, label} object (AnnotationField's own
  // shape), single-selected like Project itself -- never an array --
  // matching Type's own single-reference cardinality on the Project
  // schema.
  const [requiredType, setRequiredType] = useState(null)

  // Plain local state, each seeded with a sensible blank/default (Display
  // Role's default mirrors the schema's own `initialValue`). Reset to
  // these same blanks by goToNextDraftOrComplete whenever the queue
  // advances to a new photo -- every photo goes through Required ->
  // Optional -> Publish of its own, not shared defaults across a batch. No
  // presence validation gates Continue here: per the locked spec, every
  // field on this screen is optional.
  const [optionalLocation, setOptionalLocation] = useState('')
  const [optionalYear, setOptionalYear] = useState('')
  const [optionalFullDate, setOptionalFullDate] = useState('')
  const [optionalDescription, setOptionalDescription] = useState('')
  // Journal Entry's one Optional field -- see journalEntryType.js's
  // `caption` field ("Image Caption" in Studio). Kept separate from
  // optionalDescription above rather than reused: that state/its
  // styling (captionFieldStyle, no FieldLabel, larger unhurried type)
  // is specifically Archive Item's own caption treatment per the frozen
  // brief, and Journal Entry's field is a different schema field
  // (`caption`, not `description`) rendered with its own plain,
  // labeled quiet-field treatment below -- sharing state across the two
  // would couple two document types' fields together for no benefit.
  const [optionalCaption, setOptionalCaption] = useState('')
  const [optionalDisplayRole, setOptionalDisplayRole] = useState('Default')
  const [optionalSortOrder, setOptionalSortOrder] = useState('')
  const [optionalPrivateNotes, setOptionalPrivateNotes] = useState('')
  const [isSavingOptional, setIsSavingOptional] = useState(false)
  const [optionalSaveError, setOptionalSaveError] = useState(null)

  // The whole batch a single "Archive Item" or "Journal Entry" choice
  // created, in creation order, plus which one of them Josh is currently
  // working on. Deliberately separate from `queueItems` (the upload-UI
  // list) -- this is the only state the auto-advance behavior needs, and
  // keeping it apart avoids overloading queueItems' existing job of
  // tracking upload progress.
  const [draftQueue, setDraftQueue] = useState([])
  const [draftQueueIndex, setDraftQueueIndex] = useState(0)

  // Phase 5: batch-level, not photo-level -- lives here for the same
  // reason draftQueue does. Written in exactly one place (a photo just
  // published successfully, see goToNextDraftOrComplete) and cleared in
  // exactly one place (the batch ends, see handleStartOver). Required
  // and Optional never read this directly while a photo is open -- only
  // applySessionContext below reads it, and only at the moment a new
  // photo's fields are being set up. Once that's happened, the screen is
  // back to looking at ordinary per-draft state exactly as it always did
  // -- one source of truth for whatever's currently on screen.
  const [sessionContext, setSessionContext] = useState(EMPTY_SESSION_CONTEXT)

  // Publish. Fires the real, documented publish operation and waits for
  // its result -- see handlePublish/the operation-event effect below for
  // why this needs both a hook and an event listener rather than one
  // awaitable call.
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState(null)

  // Projects and Themes only matter for an Archive Item's Required step
  // (Journal Entry has no required fields beyond the image already
  // attached -- see journalEntryType.js), so this only fetches once
  // there's an actual archiveItem draft to show the step for. Bails early
  // once both lists are already loaded so cycling through several Archive
  // Items in one batch doesn't re-fetch the same two lists on every photo
  // -- Projects/Themes are session-wide, not per-draft.
  useEffect(() => {
    if (step !== 'required' || currentDraft?.type !== 'archiveItem') return
    if (
      availableProjects !== null &&
      availableThemes !== null &&
      availableTypes !== null
    )
      return
    let cancelled = false

    // Required-Information surfacing fix: also selects each Project's own
    // current `projectType` reference, dereferenced to `{_id, title}` --
    // needed so the Type control (see the JSX below) can show what a
    // Project *already* has the moment it's attached, existing or brand
    // new, the same way Theme's own suggestions already carry enough to
    // render a chip. Without this, `availableProjects` entries would
    // carry no Type information at all, and Type would always render as
    // "unselected" even for a Project that already has one set.
    client.fetch('*[_type == "project"]{_id, title, "projectType": projectType->{_id, title}} | order(title asc)').then(
      (docs) => {
        if (!cancelled) setAvailableProjects(docs)
      },
      (error) => {
        console.error('[ImportWorkspace] Failed to load Projects for Required step.', error)
        // Falls back to an empty (not null) list so AnnotationField stops
        // treating this as still-loading, and surfaces the failure --
        // without this, Continue stays disabled (no Project can ever be
        // chosen) with no indication why.
        if (!cancelled) {
          setAvailableProjects([])
          setRequiredLoadError(
            'Could not load Projects -- check your connection and reopen this tool.',
          )
        }
      },
    )

    client.fetch('*[_type == "theme"]{_id, title} | order(title asc)').then(
      (docs) => {
        if (!cancelled) setAvailableThemes(docs)
      },
      (error) => {
        console.error('[ImportWorkspace] Failed to load Themes for Required step.', error)
        if (!cancelled) {
          setAvailableThemes([])
          setRequiredLoadError(
            'Could not load Themes -- check your connection and reopen this tool.',
          )
        }
      },
    )

    // Type CMS authoring pass: same fetch-once-per-session shape and the
    // same blocking-on-failure treatment as Project/Theme immediately
    // above -- Type is a required field on a new Project (see
    // projectType.js), so a failed
    // load here should surface the same way a failed Project/Theme load
    // does, rather than silently leaving Continue unsatisfiable with no
    // explanation.
    //
    // Naming correction: document type is `projectType`, not the bare
    // `type` this originally queried -- Sanity rejects `type` as a
    // document schema name outright (see typeType.js's own comment),
    // so this fetch never actually succeeded until this rename. Local
    // state/handler names (availableTypes, setRequiredType, etc.) are
    // untouched -- they're plain JS identifiers with no Sanity meaning,
    // not schema terminology.
    client.fetch('*[_type == "projectType"]{_id, title} | order(title asc)').then(
      (docs) => {
        if (!cancelled) setAvailableTypes(docs)
      },
      (error) => {
        console.error('[ImportWorkspace] Failed to load Types for Required step.', error)
        if (!cancelled) {
          setAvailableTypes([])
          setRequiredLoadError(
            'Could not load Types -- check your connection and reopen this tool.',
          )
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [
    step,
    currentDraft,
    client,
    availableProjects,
    availableThemes,
    availableTypes,
  ])

  // Pulls "what's left to finish" fresh from Sanity -- the same
  // re-derive-from-source approach resolveDocumentActions.js's own
  // advance-to-next logic already uses, rather than trying to keep a
  // second, hand-maintained copy of this list in sync. Called on mount
  // (the effect below) and again from handleStartOver, so "Continue where
  // you left off" can't go stale after a batch finishes or is cancelled --
  // previously this only ran once, ever, so a batch that completed or was
  // cancelled mid-session wouldn't show up there until Josh actually left
  // and returned to this tool (a fresh mount).
  const refreshPendingDrafts = useCallback(() => {
    client.fetch(PENDING_DRAFTS_QUERY).then(
      (docs) => {
        setPendingDrafts(
          docs.map((doc) => ({id: doc._id.replace(/^drafts\./, ''), type: doc._type})),
        )
      },
      (error) => {
        console.error('[ImportWorkspace] Failed to check for unfinished drafts.', error)
      },
    )
  }, [client])

  useEffect(() => {
    refreshPendingDrafts()
  }, [refreshPendingDrafts])

  // Documented Intent API (sanity/router's useIntentLink, `@public`) --
  // resolves the correct `href` for Studio's native "edit" intent without
  // this file ever constructing a Studio URL by hand. Used only by
  // "Continue Editing" now -- the guided workflow's own Publish flow never
  // navigates into Studio (see handlePublish/goToNextDraftOrComplete
  // below).
  //
  // `params` must always be a real object, never `undefined` -- on
  // Sanity 6.7.0, useIntentLink forwards `params` into an internal
  // `encodeParams()` helper (sanity/lib/router.js) that calls
  // `Object.entries(params)` with no null-guard. `navigationTarget` starts
  // `null` on every render before a target is chosen, so `navigationTarget
  // ?? undefined` was passing `undefined` straight through on first render
  // and crashing before this component ever painted. `{}` is a valid,
  // empty IntentParameters object -- it resolves to a harmless href with
  // no params and is never acted on anyway, since the effect below still
  // only navigates once `navigationTarget` itself is truthy.
  const {href: navigationHref} = useIntentLink({
    intent: 'edit',
    params: navigationTarget ?? {},
  })

  useEffect(() => {
    if (navigationTarget && navigationHref) {
      window.location.assign(navigationHref)
    }
  }, [navigationTarget, navigationHref])

  // The documented mechanism for triggering a real Sanity publish without
  // Studio's own Publish button -- confirmed against the installed Sanity
  // 6.7.0 package's own type declarations rather than assumed:
  // `useDocumentOperation(publishedDocId, docTypeName)` takes the base
  // (non-drafts-prefixed) id, exactly the shape `currentDraft.id` already
  // is. Called unconditionally on every render (React's rules of hooks
  // forbid calling a hook only when a draft exists), so a placeholder id
  // is used whenever there's no active draft (Upload/Archive-or-
  // Journal/Complete) -- the placeholder never matches a real document, so
  // the hook simply has nothing to report until a real currentDraft
  // exists. Both hooks below are marked `@internal` in the installed
  // package's own type declarations, not `@public` -- a disclosed,
  // accepted risk, not glossed over.
  const publishDocId = currentDraft?.id || 'urbanum-import-none'
  const publishDocType = currentDraft?.type || 'archiveItem'
  const documentOperations = useDocumentOperation(publishDocId, publishDocType)
  // `publish.execute()` below is fire-and-forget (it returns void, not a
  // Promise), so completion has to be observed separately: this hook
  // reflects the most recent operation event for this exact id/type, which
  // the effect below watches for a 'publish' entry while `isPublishing` is
  // true.
  const operationEvent = useDocumentOperationEvent(publishDocId, publishDocType)

  // Multi-file: every file in the list gets its own queue entry and its
  // own independent uploadImportImage call. Nothing about the queue's
  // shape, upload lifecycle, or per-item status tracking changes: a
  // five-file drop is just five of the exact same single-file flow running
  // side by side.
  const handleFiles = useCallback(
    (fileList) => {
      const files = fileList ? Array.from(fileList) : []
      if (files.length === 0) return

      files.forEach((file) => {
        const id = crypto.randomUUID()
        setQueueItems((prev) => [
          ...prev,
          {id, filename: file.name, status: 'uploading', asset: null, draftId: null},
        ])

        uploadImportImage(client, file).then(
          (asset) => {
            setQueueItems((prev) =>
              prev.map((item) => (item.id === id ? {...item, status: 'uploaded', asset} : item)),
            )
          },
          (error) => {
            console.error('[ImportWorkspace] Failed to upload image to Sanity.', error)
            setQueueItems((prev) =>
              prev.map((item) => (item.id === id ? {...item, status: 'error'} : item)),
            )
          },
        )
      })
    },
    [client],
  )

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      handleFiles(event.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleFileInputChange = useCallback(
    (event) => {
      handleFiles(event.target.files)
      // Reset so choosing the same file again still fires onChange.
      event.target.value = ''
    },
    [handleFiles],
  )

  // Phase 5's other half of resetDraftFields -- seeds a freshly-blanked
  // photo from a session context object, rather than leaving it blank.
  // Defined here, ahead of resetDraftFields itself further down, only
  // because handleChooseType (directly below) is the first of its two call
  // sites and needs it in scope -- the two functions are still meant to be
  // read as a pair: always run resetDraftFields, then this, never this
  // instead of that, so "blank everything, then apply what the batch
  // remembers" stays one readable sequence rather than resetDraftFields
  // growing a second mode of its own. Takes the context as a plain
  // argument rather than reading the `sessionContext` state variable
  // itself, so it can be called with a context that was just computed a
  // moment ago and hasn't finished its own setSessionContext round-trip
  // yet (see goToNextDraftOrComplete) -- and so the very first draft of a
  // batch can go through this exact same path too, passing the untouched
  // EMPTY_SESSION_CONTEXT-shaped state, rather than needing its own
  // separate "first photo" case.
  //
  // Project, Location, Year, Full Date, and whether Administrative is
  // expanded are applied directly and literally -- the confidently-carried
  // tier, no confirmation step. Sort Order seeds as one more than the
  // last real value used, computed here rather than stored pre-computed,
  // so what the context remembers stays a plain fact ("this was the last
  // value") rather than a derived one. Theme suggestions are
  // deliberately NOT written into requiredThemeIds -- they
  // go into their own recent-suggestions state instead, never
  // auto-attached, always exactly one tap away from becoming real.
  const applySessionContext = useCallback(
    (context) => {
      setRequiredProject(context.project)
      // Required-Information surfacing fix: re-derives Type from
      // availableProjects by id rather than trusting whatever shape
      // context.project already carries -- it may or may not include
      // `.projectType` depending on which of the three attach paths
      // produced it (see the Project AnnotationField's onAttach and
      // handleCreateProject's own existing-title match above), so a
      // fresh, consistent lookup here is what keeps Type correctly
      // populated for photo 2+ within a batch on the same Project, the
      // same way recentThemeSuggestions below re-derives from
      // availableThemes rather than trusting anything carried in context.
      const matchedProject = context.project
        ? (availableProjects || []).find((project) => project._id === context.project._id)
        : null
      setRequiredType(
        matchedProject?.projectType
          ? {_id: matchedProject.projectType._id, title: matchedProject.projectType.title}
          : null,
      )
      setOptionalLocation(context.location)
      setOptionalYear(context.year)
      setOptionalFullDate(context.fullDate)
      setShowAdministrative(context.administrativeExpanded)

      const lastSortOrder = Number(context.lastSortOrder)
      setOptionalSortOrder(
        context.lastSortOrder !== '' && !Number.isNaN(lastSortOrder)
          ? String(lastSortOrder + 1)
          : '',
      )

      setRecentThemeSuggestions(
        context.recentThemeIds
          .map((id) => {
            const theme = (availableThemes || []).find((t) => t._id === id)
            return theme ? {id, label: theme.title} : null
          })
          .filter(Boolean),
      )
    },
    [availableThemes, availableProjects],
  )

  // Choosing a type creates one draft per uploaded (not still-uploading,
  // not errored) queue item. Instead of handing off to Studio's native
  // editor for the first draft, the guided Required step takes over inside
  // this same component. `draftQueue`: the full, ordered list of every
  // draft this one choice just created, so the whole batch (not only the
  // first photo) gets its own turn through Required/Optional/Publish
  // before the Complete screen appears -- see goToNextDraftOrComplete
  // below.
  //
  // RETRY SAFETY: on failure, queue items are left completely untouched
  // -- `status` stays 'uploaded' and `asset` is never cleared, so
  // `itemsToConvert` below finds exactly the same items on the next
  // attempt. Nothing in this catch block, or anywhere else in this file,
  // calls uploadImportImage again -- retrying only ever re-runs
  // createImportDrafts against assets that already exist in Sanity.
  const handleChooseType = useCallback(
    async (docType) => {
      // Excludes items that already have a draftId as a defense-in-depth
      // guard: a draft, once created for a photo, should never be created
      // a second time for that same photo. (The one reachable path back to
      // this screen with stale items -- Required's old "Back" button --
      // is removed below in favor of "Cancel Import", which clears
      // queueItems entirely; this filter protects against any other way
      // this function could ever run twice for the same batch.)
      const itemsToConvert = queueItems.filter(
        (item) => item.status === 'uploaded' && !item.draftId,
      )
      if (itemsToConvert.length === 0 || isCreatingDrafts) return

      setDraftCreationError(null)
      setIsCreatingDrafts(true)

      try {
        const createdItems = await createImportDrafts(client, docType, itemsToConvert)

        setQueueItems((prev) =>
          prev.map((item) => {
            const created = createdItems.find((c) => c.id === item.id)
            return created ? {...item, draftId: created.baseId} : item
          }),
        )

        // Reset here now (previously unnecessary -- success used to hand
        // off to Studio's native editor, unmounting this component before
        // a stale `true` here could ever matter). Now that Required
        // renders in place, leaving this true would wrongly show "Creating
        // draft(s)…" if Josh ever presses Back to Archive-or-Journal.
        setIsCreatingDrafts(false)

        const queue = createdItems.map((created) => ({id: created.baseId, type: docType}))
        setDraftQueue(queue)
        setDraftQueueIndex(0)
        setCurrentDraft(queue[0])
        // Journal Entry bypasses Required entirely and goes straight to
        // Optional -- journalEntryType.js has no required fields beyond
        // the image already attached, so there is nothing for a Required
        // screen to collect for it.
        setStep(docType === 'archiveItem' ? 'required' : 'optional')
        // Phase 5: the batch's first photo goes through the exact same
        // apply step every later photo does, rather than being a special
        // case -- at this point sessionContext is always
        // EMPTY_SESSION_CONTEXT-shaped (handleStartOver guarantees that on
        // every path back to this screen), so this seeds blanks/defaults
        // today. Calling it here, instead of leaving the first photo to
        // rely on useState's own initial values, is what keeps that
        // guarantee true by construction rather than by two places having
        // to independently agree on the same blank state.
        applySessionContext(sessionContext)
      } catch (error) {
        console.error('[ImportWorkspace] Failed to create draft documents.', error)
        setDraftCreationError(
          'Could not create the draft. Your uploaded image is safe -- try again.',
        )
        setIsCreatingDrafts(false)
      }
    },
    [client, queueItems, isCreatingDrafts, sessionContext, applySessionContext],
  )

  // Resumes the oldest unfinished draft from a previous batch. Reuses the
  // exact same navigationTarget/useIntentLink machinery above -- "continue
  // an old draft" and "open a just-created one" are the same action from
  // Studio's perspective, just with the id coming from a different place.
  // This is still the one exception to "the guided workflow never opens
  // the native document editor" -- a recovery path for an old, abandoned
  // draft, per the locked implementation plan.
  const handleContinueEditing = useCallback(() => {
    if (pendingDrafts && pendingDrafts.length > 0) {
      setNavigationTarget(pendingDrafts[0])
    }
  }, [pendingDrafts])

  // Restores the ability to create a new Project or Theme without leaving
  // the importer -- Studio's own native reference input has an inline
  // "create new" affordance built in, and this screen has needed its own
  // equivalent ever since it replaced that input with its own controls.
  // Originally that was a dedicated "+ New Project"/"+ New Theme" button
  // opening a separate mini-form; as of Milestone 5, both are triggered
  // instead by AnnotationField's own "Create" row (see the merged
  // Required/Optional region below) -- same two functions, same
  // dedupe-by-existing-title logic, only the trigger changed, from a
  // button reading its own form state to a callback receiving the typed
  // text directly.
  //
  // Created as real, already-published documents (no `drafts.` prefix) --
  // unlike Archive Item/Journal Entry drafts, a Project or Theme is a
  // shared, reusable reference target that other documents need to be able
  // to point to immediately, with no separate "finish publishing the
  // Project" step of its own to track.
  //
  // Guards against an accidental duplicate: if a Project/Theme with the
  // same title (case-insensitive) already exists in the already-loaded
  // list, that existing one is selected instead of creating a new one with
  // the same name.
  const handleCreateProject = useCallback(async (rawTitle) => {
    const title = (rawTitle || '').trim()
    if (!title || isSavingNewProject) return
    setNewProjectError(null)

    const existing = (availableProjects || []).find(
      (project) => project.title.trim().toLowerCase() === title.toLowerCase(),
    )
    if (existing) {
      setRequiredProject(existing)
      setIsNewProject(false)
      // Required-Information surfacing fix: `existing` already carries
      // its own `projectType` (the fetch effect above now selects it),
      // so this seeds Type directly, no extra lookup needed -- same
      // reasoning as the Project AnnotationField's own onAttach above.
      setRequiredType(
        existing.projectType
          ? {_id: existing.projectType._id, title: existing.projectType.title}
          : null,
      )
      return
    }

    setIsSavingNewProject(true)
    try {
      // Project's schema requires a unique `slug` and an integer
      // `sortOrder` (see projectType.js) -- a plain client.create() doesn't
      // enforce schema validation, but leaving these out anyway would hand
      // back a Project the frontend's own Previous/Next navigation
      // (projectContent.js) can't order, and Structure would immediately
      // flag as incomplete. Slug is generated from the title and checked
      // for a collision; Sort Order defaults to one past the current
      // highest, so a new Project quietly lands at the end of the order
      // rather than fighting for a specific position -- Josh can always
      // fine-tune it later in Structure.
      const baseSlug =
        title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 96) || 'project'

      const [slugCollision, maxSortOrder] = await Promise.all([
        client.fetch('*[_type == "project" && slug.current == $slug][0]._id', {slug: baseSlug}),
        client.fetch('*[_type == "project"] | order(sortOrder desc) [0].sortOrder'),
      ])
      const slug = slugCollision ? `${baseSlug}-${crypto.randomUUID().slice(0, 4)}` : baseSlug

      const created = await client.create({
        _type: 'project',
        title,
        slug: {_type: 'slug', current: slug},
        sortOrder: (typeof maxSortOrder === 'number' ? maxSortOrder : 0) + 1,
      })

      setAvailableProjects((prev) =>
        [...(prev || []), {_id: created._id, title: created.title}].sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
      )
      setRequiredProject({_id: created._id, title: created.title})
      setIsNewProject(true)
    } catch (error) {
      console.error('[ImportWorkspace] Failed to create new Project.', error)
      setNewProjectError('Could not create Project -- try again.')
    } finally {
      setIsSavingNewProject(false)
    }
  }, [client, isSavingNewProject, availableProjects])

  // Same reasoning as handleCreateProject above, much simpler -- Theme's
  // schema (themeType.js) has only a required `title`, so there's no
  // slug/sort-order bookkeeping to do first.
  const handleCreateTheme = useCallback(async (rawTitle) => {
    const title = (rawTitle || '').trim()
    if (!title || isSavingNewTheme) return
    setNewThemeError(null)

    const existing = (availableThemes || []).find(
      (theme) => theme.title.trim().toLowerCase() === title.toLowerCase(),
    )
    if (existing) {
      setRequiredThemeIds((prev) =>
        prev.includes(existing._id) ? prev : [...prev, existing._id],
      )
      return
    }

    setIsSavingNewTheme(true)
    try {
      const created = await client.create({_type: 'theme', title})
      setAvailableThemes((prev) =>
        [...(prev || []), {_id: created._id, title: created.title}].sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
      )
      setRequiredThemeIds((prev) => [...prev, created._id])
    } catch (error) {
      console.error('[ImportWorkspace] Failed to create new Theme.', error)
      setNewThemeError('Could not create Theme -- try again.')
    } finally {
      setIsSavingNewTheme(false)
    }
  }, [client, isSavingNewTheme, availableThemes])

  // Type CMS authoring pass: same dedupe-then-create shape as
  // handleCreateProject/handleCreateTheme above, but single-select like
  // handleCreateProject (setRequiredType, not append-to-array) -- a
  // Project has exactly one Type, the same cardinality Theme's own
  // `projectType` field on projectType.js now carries as a single
  // reference. No slug/sortOrder bookkeeping (typeType.js has only
  // `title`, the same reason handleCreateTheme above needs none either).
  //
  // Naming correction: creates a `projectType` document, not the bare
  // `type` this originally created -- Sanity rejects `type` as a document
  // schema name outright (see typeType.js's own comment), so this create
  // call never actually succeeded until this rename.
  const handleCreateType = useCallback(async (rawTitle) => {
    const title = (rawTitle || '').trim()
    if (!title || isSavingNewType) return
    setNewTypeError(null)

    const existing = (availableTypes || []).find(
      (type) => type.title.trim().toLowerCase() === title.toLowerCase(),
    )
    if (existing) {
      setRequiredType(existing)
      return
    }

    setIsSavingNewType(true)
    try {
      const created = await client.create({_type: 'projectType', title})
      setAvailableTypes((prev) =>
        [...(prev || []), {_id: created._id, title: created.title}].sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
      )
      setRequiredType({_id: created._id, title: created.title})
    } catch (error) {
      console.error('[ImportWorkspace] Failed to create new Type.', error)
      setNewTypeError('Could not create Type -- try again.')
    } finally {
      setIsSavingNewType(false)
    }
  }, [client, isSavingNewType, availableTypes])

  // Writes the Required fields onto currentDraft via patchImportDraft.js
  // and, on success, advances to Optional. Only ever called for an Archive
  // Item draft now -- Journal Entry bypasses Required entirely.
  const handleSaveRequired = useCallback(async () => {
    if (!currentDraft) return
    setRequiredSaveError(null)
    setIsSavingRequired(true)
    try {
      await patchImportDraft(client, currentDraft.id, {
        project: {_type: 'reference', _ref: requiredProject._id},
        themes: requiredThemeIds.map((id) => ({_type: 'reference', _ref: id})),
      })
      setStep('optional')
    } catch (error) {
      console.error('[ImportWorkspace] Failed to save Required fields.', error)
      setRequiredSaveError('Could not save -- try Continue again.')
    } finally {
      setIsSavingRequired(false)
    }
  }, [client, currentDraft, requiredProject, requiredThemeIds])

  // Shared by goToNextDraftOrComplete (advancing within a batch) and
  // handleStartOver (ending or cancelling one) -- every per-draft field
  // resets to the exact same blank/default either way. Pulled into one
  // function so the two call sites can't quietly drift out of sync (e.g. a
  // new Optional field added to one reset list and forgotten in the
  // other).
  const resetDraftFields = useCallback(() => {
    setRequiredProject(null)
    setRequiredThemeIds([])
    setRecentThemeSuggestions([])
    setIsSavingNewProject(false)
    setNewProjectError(null)
    setIsNewProject(false)
    setNewProjectLocation('')
    setNewProjectDate('')
    // Type resets to blank on the same schedule as every other per-draft
    // Required field (Project/Theme above) -- it's no longer scoped
    // to isNewProject the way newProjectLocation/newProjectDate still are
    // (see requiredType's own declaration comment for why), but photo
    // 2+ within a batch on the same Project gets it correctly re-seeded
    // straight back by applySessionContext, called immediately after
    // this same reset.
    setRequiredType(null)
    setIsSavingNewType(false)
    setNewTypeError(null)
    setIsSavingNewTheme(false)
    setNewThemeError(null)
    setOptionalLocation('')
    setOptionalYear('')
    setOptionalFullDate('')
    setOptionalDescription('')
    setOptionalCaption('')
    setOptionalDisplayRole('Default')
    setOptionalSortOrder('')
    setOptionalPrivateNotes('')
    setRequiredSaveError(null)
    setOptionalSaveError(null)
    setPublishError(null)
    setShowAdministrative(false)
  }, [])

  // Advances the in-memory batch queue to the next photo, or -- once the
  // whole batch is done -- to the Complete screen. Uses `draftQueue`, built
  // once per batch in handleChooseType, rather than re-querying
  // PENDING_DRAFTS_QUERY the way resolveDocumentActions.js's native-Studio
  // fallback has to: this component already holds the whole batch's order
  // in memory from the moment it was created. Every photo in the batch
  // goes through Required -> Optional -> Publish of its own, not shared
  // defaults carried across photos -- resetDraftFields above handles that.
  const goToNextDraftOrComplete = useCallback(() => {
    // Phase 5: this is the one place a photo is known to have just
    // published successfully, so it's the one place the batch's memory
    // updates -- read directly from the per-draft state that's about to be
    // reset, before resetDraftFields blanks it. Built as a local variable
    // rather than round-tripped through setSessionContext and read back --
    // a state update isn't visible again until the next render, and
    // applySessionContext below needs the value now, in this same tick.
    // Theme ids are reversed before merging: requiredThemeIds
    // accumulates in attach order (oldest first), but "Recent"
    // means most-recently-used first, so whatever was attached last on
    // this photo belongs at the front, ahead of anything already in
    // sessionContext from earlier photos.
    const nextContext = {
      project: requiredProject,
      recentThemeIds: dedupeRecentIds(
        [...requiredThemeIds].reverse(),
        sessionContext.recentThemeIds,
        RECENT_LIMIT,
      ),
      location: optionalLocation,
      year: optionalYear,
      fullDate: optionalFullDate,
      administrativeExpanded: showAdministrative,
      lastSortOrder: optionalSortOrder,
    }
    setSessionContext(nextContext)

    const nextIndex = draftQueueIndex + 1
    if (nextIndex < draftQueue.length) {
      resetDraftFields()
      const next = draftQueue[nextIndex]
      setDraftQueueIndex(nextIndex)
      setCurrentDraft(next)
      setStep(next.type === 'archiveItem' ? 'required' : 'optional')
      applySessionContext(nextContext)
    } else {
      // Clears the active draft before Complete renders. Every OTHER
      // step without an active draft (Upload, Choose Type) already falls
      // back to the safe `publishDocId = currentDraft?.id ||
      // 'urbanum-import-none'` placeholder below precisely because
      // `currentDraft` is null there; this routes Complete through that
      // same already-safe path, rather than leaving
      // useDocumentOperation/useDocumentOperationEvent (both @internal,
      // see their own comment) subscribed to the just-published
      // document's id after it no longer has a `drafts.` counterpart.
      setCurrentDraft(null)
      setStep('complete')
    }
  }, [
    draftQueue,
    draftQueueIndex,
    resetDraftFields,
    requiredProject,
    requiredThemeIds,
    optionalLocation,
    optionalYear,
    optionalFullDate,
    showAdministrative,
    optionalSortOrder,
    sessionContext,
    applySessionContext,
  ])

  // Fires the real, documented publish operation for currentDraft.
  // Fire-and-forget by design -- the operation-event effect below is what
  // actually reacts to success or failure and calls
  // goToNextDraftOrComplete.
  const handlePublish = useCallback(() => {
    if (!currentDraft || isPublishing) return
    // `documentOperations.publish` can be momentarily absent right after
    // currentDraft changes (before useDocumentOperation resolves the new
    // id/type pair). Guarding on its presence, not just `.disabled`, avoids
    // calling `.execute()` on undefined and crashing the whole workspace
    // mid-batch.
    if (!documentOperations.publish || documentOperations.publish.disabled) return
    setPublishError(null)
    setIsPublishing(true)
    documentOperations.publish.execute()
  }, [currentDraft, isPublishing, documentOperations])

  // Writes the Optional fields onto currentDraft via patchImportDraft.js
  // and, on success, immediately triggers the same real publish operation
  // handlePublish fires -- there is no separate Review step anymore to
  // pause on first (it added a screen without adding enough value to
  // justify it), so this one action now both saves and publishes. Nothing
  // about the publish mechanism itself changes: this only decides when it
  // gets called. If the save fails, publish is never attempted and
  // optionalSaveError shows exactly as it always has; if the save succeeds
  // but the publish itself then fails, handlePublish's own publishError
  // path is unchanged and reused as-is.
  //
  // Text fields are sent through even when empty, so clearing a field is
  // itself a real saved edit rather than a silent no-op. Year and Sort
  // Order are only included when they parse to an actual number -- sending
  // `NaN` from an empty or non-numeric input would write an invalid value
  // to a `number` field. Full Date is only included when non-empty, for
  // the same reason. Current schema only, exactly as it exists today.
  //
  // Journal Entry's only Optional field is Image Caption (`caption` on
  // journalEntryType.js) -- always sent, even empty, same "a text field
  // is sent through even blank, so clearing it is itself a real saved
  // edit" reasoning Description's own comment below already establishes
  // for Archive Item. No Location/Year/Sort Order/Display Role/Private
  // Notes branch applies to this type (this uploader doesn't capture
  // any of those for Journal Entry), so this is the entire save step
  // for it -- a much smaller version of the archiveItem path below, not
  // a shared one, since the two types' fields don't overlap.
  const handleSaveOptional = useCallback(async () => {
    if (!currentDraft) return
    setOptionalSaveError(null)

    if (currentDraft.type === 'journalEntry') {
      setIsSavingOptional(true)
      try {
        await patchImportDraft(client, currentDraft.id, {caption: optionalCaption})
        handlePublish()
      } catch (error) {
        console.error('[ImportWorkspace] Failed to save Optional fields.', error)
        setOptionalSaveError('Could not save -- try Continue again.')
      } finally {
        setIsSavingOptional(false)
      }
      return
    }

    setIsSavingOptional(true)
    try {
      const fields = {
        // Normalized only here, right at the save boundary -- see
        // normalizeLocation's own comment. optionalLocation (the field
        // on screen, and what's carried into nextContext for the next
        // photo) is left exactly as typed; only the value actually
        // written to Sanity is normalized.
        location: normalizeLocation(optionalLocation),
        description: optionalDescription,
        privateNotes: optionalPrivateNotes,
        displayRole: optionalDisplayRole,
      }
      if (optionalYear.trim() !== '' && !Number.isNaN(Number(optionalYear))) {
        fields.year = Number(optionalYear)
      }
      if (optionalFullDate.trim() !== '') {
        fields.fullDate = optionalFullDate
      }
      if (optionalSortOrder.trim() !== '' && !Number.isNaN(Number(optionalSortOrder))) {
        fields.sortOrder = Number(optionalSortOrder)
      }

      // UX pass ("New Project workflow"): the one place this screen
      // writes to a Project document, and only when isNewProject says
      // this batch's Project was just created by handleCreateProject
      // above -- an existing, previously-published Project is never
      // touched. Deferred to this same publish boundary rather than
      // written the moment the New Project section is filled in, so a
      // Project only gains a Location/Year once its Archive Item is
      // actually being committed, not from a section that was filled in
      // and then abandoned. Project documents aren't drafts (see
      // handleCreateProject's own comment on why they're created
      // already-published), so this is a direct client.patch -- not
      // patchImportDraft.js, which always targets a `drafts.`-prefixed
      // id. Location reuses normalizeLocation for the same "consistent
      // format" reasoning as Optional's own Location field just above;
      // Project Date is the schema's existing `year` field (Project has
      // no separate exact-date field -- see projectType.js), only
      // included when it parses to an actual number, same guard as
      // Optional's Year field.
      if (isNewProject && requiredProject?._id) {
        const newProjectFields = {location: normalizeLocation(newProjectLocation)}
        if (newProjectDate.trim() !== '' && !Number.isNaN(Number(newProjectDate))) {
          newProjectFields.year = Number(newProjectDate)
        }
        await client.patch(requiredProject._id).set(newProjectFields).commit()
      }

      // Required-Information surfacing fix: Type's own write, kept as a
      // separate patch from the isNewProject-only block immediately
      // above rather than folded into it -- Location/Year genuinely are
      // only ever set at Project-creation time (an existing, previously-
      // published Project's Location/Year is never touched by this
      // screen, a rule this fix leaves completely alone), but Type is now
      // surfaced and editable for every Project, new or existing (see the
      // Type field's own comment in the JSX below), so its write can't be
      // gated the same way. Only ever a `set` -- if requiredType is empty
      // (Type field cleared without a replacement picked), nothing is
      // patched, so this can extend an existing Project with a Type it's
      // missing or change it to a different one, but never unset a
      // Project's existing Type by omission; same conservative,
      // additive-only posture the isNewProject block above already has
      // for Location/Year, just applied to a field that's no longer
      // creation-only. Reference target is `projectType` (see
      // projectType.js's own field), matching the naming correction
      // already applied elsewhere in this file.
      if (requiredProject?._id && requiredType?._id) {
        await client
          .patch(requiredProject._id)
          .set({projectType: {_type: 'reference', _ref: requiredType._id}})
          .commit()
      }

      await patchImportDraft(client, currentDraft.id, fields)
      handlePublish()
    } catch (error) {
      console.error('[ImportWorkspace] Failed to save Optional fields.', error)
      setOptionalSaveError('Could not save -- try Continue again.')
    } finally {
      setIsSavingOptional(false)
    }
  }, [
    client,
    currentDraft,
    optionalLocation,
    optionalDescription,
    optionalCaption,
    optionalPrivateNotes,
    optionalDisplayRole,
    optionalYear,
    optionalFullDate,
    optionalSortOrder,
    isNewProject,
    requiredProject,
    newProjectLocation,
    newProjectDate,
    requiredType,
    handlePublish,
  ])

  // Watches for the publish operation's own result. Only reacts while
  // `isPublishing` is true and only to a 'publish' event, so an unrelated
  // operation event can't be mistaken for this one.
  useEffect(() => {
    if (!isPublishing || !operationEvent || operationEvent.op !== 'publish') return

    setIsPublishing(false)
    if (operationEvent.type === 'success') {
      goToNextDraftOrComplete()
    } else {
      setPublishError(operationEvent.error?.message || 'Could not publish -- try again.')
    }
  }, [operationEvent, isPublishing, goToNextDraftOrComplete])

  // Resets the batch back to Upload. Originally shared by three
  // Complete-screen buttons ("Archive More"/"Journal More"/"Finish for
  // Now"); the completion screen was simplified in the final UX polish
  // pass to a single "Upload More" button, which is this same reset --
  // nothing about what the reset itself does changed. Nothing here
  // navigates anywhere; the guided workflow stays entirely
  // self-contained, as instructed.
  const handleStartOver = useCallback(() => {
    setQueueItems([])
    setIsCreatingDrafts(false)
    setDraftCreationError(null)
    setCurrentDraft(null)
    setDraftQueue([])
    setDraftQueueIndex(0)
    // Phase 5: the batch's memory is destroyed exactly when the batch
    // itself ends -- every path back to Upload (now just "Upload More")
    // reduces to this same reset, so a new batch never inherits an old
    // one's Project, Recent Themes, Location, or Date.
    setSessionContext(EMPTY_SESSION_CONTEXT)
    resetDraftFields()
    // Projects/Themes are cached for the life of a session (see the
    // Required-step fetch effect above) as a deliberate optimization, but
    // that means a Project or Theme created in Structure mid-session would
    // never show up here without a way to force a refetch. Clearing these
    // (and requiredLoadError) whenever a batch truly ends or is cancelled
    // gives every new batch a fresh, authoritative list at a natural,
    // low-cost point, without adding a whole cache-invalidation mechanism.
    setAvailableProjects(null)
    setAvailableThemes(null)
    setRequiredLoadError(null)
    // Re-derives "what's left to finish" immediately rather than waiting
    // for a full remount to notice it -- otherwise a batch that just
    // completed or was cancelled here wouldn't appear in "Continue where
    // you left off" until Josh actually left and returned to this tool.
    refreshPendingDrafts()
    setStep('upload')
  }, [resetDraftFields, refreshPendingDrafts])

  // WORKFLOW BUG FIX (Cancel Import leaves an orphaned draft): a draft
  // already exists by the time either Cancel Import button is reachable
  // -- handleChooseType creates one real `drafts.` document per uploaded
  // photo up front, before Required or Optional ever render (see
  // createImportDrafts.js's own comment on why: this screen patches that
  // same draft incrementally as Josh fills in fields, and the Continue
  // Previous/Resume Editing feature depends on unfinished drafts actually
  // existing in Sanity between sessions). Deferring draft creation until
  // Publish was considered and rejected -- it would mean buffering every
  // Required/Optional edit in local state only and would break Continue
  // Previous entirely, a real, already-shipped feature, for something
  // well past "the smallest possible fix." So the draft has to exist
  // during the workflow, which means Cancel Import's job is to clean it
  // up, not avoid creating it -- this is that cleanup.
  //
  // draftQueue.slice(draftQueueIndex): the currently active draft plus
  // every later one still queued behind it in this batch. Anything
  // BEFORE draftQueueIndex already went through a successful publish --
  // goToNextDraftOrComplete only ever advances past an index after that
  // photo's own 'publish' operation event succeeds (see the
  // operationEvent effect above) -- so those are real published
  // documents now, not drafts, and this deliberately never touches them.
  //
  // A single transaction (mirroring createImportDrafts.js's own
  // tx.create() reduce, just tx.delete() instead) rather than separate
  // client.delete() calls per id, for the same atomicity createImportDrafts
  // already gets from its own transaction.
  //
  // If the delete fails, this still falls through to handleStartOver --
  // Cancel Import should never trap Josh on a broken screen because
  // cleanup failed; a leftover draft from a failed delete is a smaller,
  // still-recoverable problem (Continue Previous will surface it again
  // next visit, or Josh can delete it directly in Studio) than a stuck
  // Cancel button.
  const handleCancelImport = useCallback(async () => {
    const idsToDelete = draftQueue.slice(draftQueueIndex).map((item) => `drafts.${item.id}`)

    if (idsToDelete.length > 0) {
      setIsCancellingImport(true)
      try {
        await idsToDelete.reduce((tx, id) => tx.delete(id), client.transaction()).commit()
      } catch (error) {
        console.error('[ImportWorkspace] Failed to delete cancelled draft(s).', error)
      } finally {
        setIsCancellingImport(false)
      }
    }

    handleStartOver()
  }, [client, draftQueue, draftQueueIndex, handleStartOver])

  // Navigates to the Archive's default section (Archive Items) via
  // `router.navigateUrl({path})` rather than <StateLink>/useStateLink,
  // because this component always renders inside RouteScope (see the
  // comment at the top of this component). navigateUrl is the one router
  // method RouteScope doesn't re-scope, so it reaches the root router
  // directly with a plain absolute path. The path is built the same way
  // Studio's own router internals join a workspace's basePath with a
  // segment, rather than assuming basePath is always '/' or always
  // has/lacks a trailing slash.
  //
  // Navigation-architecture pass ("one Archive application, four
  // sections"): the old single 'library' tool is now four separate
  // Structure Tools (see archiveSections.js), so this now targets
  // DEFAULT_ARCHIVE_TOOL_NAME ('archiveItems') specifically -- the same
  // destination "Archive" in the top nav links to (UrbanumToolMenu.jsx)
  // -- rather than a tool name that no longer exists. The button's own
  // label already reads "View Archive" (renamed in an earlier
  // terminology pass); only where it navigates changed here.
  const handleViewLibrary = useCallback(() => {
    const path = `/${[basePath, DEFAULT_ARCHIVE_TOOL_NAME]
      .map((segment) => (segment || '').replace(/^\/+/, '').replace(/\/+$/, ''))
      .filter(Boolean)
      .join('/')}`
    router.navigateUrl({path})
  }, [router, basePath])

  const hasPendingDrafts = Boolean(pendingDrafts && pendingDrafts.length > 0)

  // Drives Region 0's progress indicator only. While a publish is actually
  // in flight the indicator borrows the nominal 'publish' key (there is no
  // real `step` value of 'publish'); once the whole batch is done, every
  // step reads as complete.
  const indicatorStepKey = isPublishing ? 'publish' : step
  const currentStepIndex =
    step === 'complete'
      ? STEP_SEQUENCE.length
      : STEP_SEQUENCE.findIndex((entry) => entry.key === indicatorStepKey)
  const currentStepLabel = step === 'complete' ? 'Complete' : STEP_SEQUENCE[currentStepIndex]?.label || ''
  const displayStepNumber = Math.min(currentStepIndex + 1, STEP_SEQUENCE.length)
  const progressPercent = Math.max(
    0,
    Math.min(100, (displayStepNumber / STEP_SEQUENCE.length) * 100),
  )

  // Everything Required/Optional show about the current photo is simply the
  // same local state already collected -- no new fetch, no new mutation.
  // The thumbnail is looked up from queueItems (which still holds the
  // uploaded asset) via the `draftId` handleChooseType already stamps on
  // each item, matched against currentDraft.id. Shared by both screens, so
  // the image stays a persistent anchor throughout, not only on Required.
  const activeQueueItem = queueItems.find((item) => item.draftId === currentDraft?.id)
  const activeThumbnailUrl = activeQueueItem?.asset?.url
  // How many photos this batch contained -- only ever read once every one
  // of them has already been published (Complete is only reached after
  // goToNextDraftOrComplete runs out of queue), so this is always an
  // accurate "how many just went live" count, not a live-updating total.
  const batchCount = draftQueue.length

  // Phase 4: the same condition Continue's disabled state already checked,
  // now named and reused to also decide what's even on screen -- Theme
  // only exists once a Project is attached,
  // and Continue itself only appears once every field is satisfied. Not a
  // new rule, just the existing one read in one more place.
  // Required-Information surfacing fix: Type is now always visible and
  // selectable once a Project is attached (existing or brand new -- see
  // the Type block's own comment in the JSX below), so this gate no
  // longer special-cases isNewProject the way it briefly did -- Type is
  // simply required, the same unconditional way Project/Theme
  // already are. An existing Project that already has a Type gets
  // requiredType seeded automatically (see applySessionContext and the
  // Project field's own onAttach/handleCreateProject above), so this
  // only actually blocks Continue for a Project -- new or legacy -- that
  // genuinely has no Type set yet, which is the correct behavior for a
  // schema-required field.
  const requiredComplete =
    Boolean(requiredProject) &&
    requiredThemeIds.length > 0 &&
    Boolean(requiredType)

  return (
    // Container's `width` prop isn't a loose cap -- @sanity/ui's own
    // container scale (confirmed against the installed 3.5.0 package
    // directly: [320, 640, 960, 1280, 1600, 1920]) means `width={1}` was
    // hard-capping this ENTIRE tool at 640px, regardless of anything set
    // on the Boxes below. Every width-related redesign pass before this
    // one was rendering inside that 640px ceiling -- `width="auto"`
    // removes it, so LEFT_SIDEBAR_WIDTH/RIGHT_SIDEBAR_WIDTH below are now
    // the only width constraints this tool has (CENTER stays `flex: 1`,
    // uncapped).
    //
    // Height: `minHeight: '100vh'` (an earlier attempt at "fill the
    // browser") was wrong -- confirmed by reading the installed sanity
    // 6.7.0 package's own StudioLayoutComponent directly rather than
    // guessing. Studio already wraps every Tool in
    // `<Flex direction="column" height="fill"><Navbar/><Card flex={1}>
    // {tool}</Card></Flex>` -- the same mechanism every Studio tool,
    // including Desk, already relies on to fill the browser correctly.
    // That Card is our REAL parent, and it already resolves to "full
    // viewport minus the navbar's own height" -- not the full viewport.
    // `100vh` doesn't know the navbar already took some of that space, so
    // it was pushing our content's bottom edge past the actual window.
    // `height: '100%'` matches the Card's real, already-correct height
    // instead of re-guessing it, and `overflowY: 'auto'` means content
    // that's genuinely taller than the available area scrolls inside the
    // tool -- the navbar stays put, the workspace behaves like a fixed
    // pane, not a page.
    //
    // Visual-polish pass ("browser edge padding" -- round 2): the previous
    // fix here (`scrollbarGutter: 'stable'` on this same padded, scrolling
    // Container) was still reported asymmetric, so this uses a more
    // robust, browser-support-independent structural fix instead of
    // leaning on that one CSS property. The actual cause is unchanged --
    // a scrolling element's scrollbar track is carved out of ITS OWN
    // padding box, so a Container that is BOTH the scroll container AND
    // the horizontally-padded box will always show a slightly tighter
    // right-hand gutter than left whenever content is tall enough to
    // scroll. The fix: split those two jobs across two elements. This
    // Container now only scrolls (no horizontal padding of its own); the
    // padding moves to a plain inner Box below that never scrolls, so its
    // declared 32px is never in a position to be eaten into on either
    // side, regardless of scrollbar width/visibility/browser support.
    <Container
      width="auto"
      style={{
        backgroundColor: '#faf9f5',
        height: '100%',
        overflowY: 'auto',
        // Final UX polish pass ("Responsive center column"): CENTER now
        // has a real floor width (CENTER_MIN_WIDTH, below) instead of
        // shrinking indefinitely -- once the browser is narrower than
        // LEFT + CENTER's floor + RIGHT combined, the three-column Flex
        // is simply wider than the viewport. This lets that overflow
        // scroll horizontally instead of clipping content no one could
        // otherwise reach.
        overflowX: 'auto',
      }}
    >
      {/* Subtle, typography-only motion. Upload/Archive-or-Journal/Complete
          each carry a `key={step}` on their own outer Stack, so React
          remounts them on every step change, replaying this same quiet
          fade/rise. Required and Optional deliberately do NOT do this
          anymore (Phase 3, Milestone 1) -- see the merged Required/Optional
          region below for why: the photo has to survive a step change
          untouched, so only its metadata panel remounts, not the whole
          region. Nothing flashy anywhere, no motion library -- just enough
          to keep a step change from feeling like a hard cut. */}
      <style>{`
        @keyframes urbanumStepIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .urbanum-field {
          transition: border-color 200ms ease-out;
        }
        .urbanum-field:focus {
          outline: none;
          border-bottom-color: ${INK} !important;
        }
        /* Phase 3, Milestone 4: Optional's inputs go one step past
           Milestone 3's always-visible hairline underline -- "use
           whitespace instead of borders wherever possible" reads, for an
           input, as "no border until it's actually relevant." The line's
           width/style (1px solid, from quietFieldStyle's inline
           borderBottom) is untouched; only its color is overridden here,
           transparent at rest, revealed on hover, and darkened to match
           .urbanum-field's own focus treatment. The Project/Theme
           "create new" inputs stay on plain
           .urbanum-field (always-visible hairline) -- they gate Continue,
           so they keep a constant, findable presence rather than needing
           a hover to locate. */
        .urbanum-field-recede {
          border-bottom-color: transparent !important;
        }
        .urbanum-field-recede:hover {
          border-bottom-color: ${HAIRLINE} !important;
        }
        .urbanum-field-recede:focus {
          outline: none;
          border-bottom-color: ${INK} !important;
        }
        /* Round E ("Responsive Layout"): the upload dropzone's own
           padding used to be a fixed Card padding={7} (84px) prop --
           fine at CENTER's widest, but as CENTER shrinks while resizing,
           that same fixed 84px eats a growing share of the available
           width, leaving the icon+text content looking cramped well
           before CENTER hits its own CENTER_MIN_WIDTH floor. A plain CSS
           class (not the padding prop) so it can respond to viewport
           width directly -- CENTER's width tracks the browser's fairly
           closely, since the sidebars either side of it stay fixed. */
        .urbanum-upload-card {
          padding: 84px;
        }
        @media (max-width: 1400px) {
          .urbanum-upload-card {
            padding: 48px;
          }
        }
        /* UI cohesion pass ("Responsive Uploader"): moved out of inline
           style/props (paddingLeft/paddingRight, the Flex gap prop,
           LEFT/RIGHT's width/minWidth) and into CSS classes -- a plain
           style/prop value can't respond to a media query, a class can.
           Base rules below match today's values exactly (see
           SHELL_HORIZONTAL_PADDING/COLUMN_GAP/LEFT_SIDEBAR_WIDTH/
           RIGHT_SIDEBAR_WIDTH above), so nothing changes above
           OVERFLOW_THRESHOLD. The three @media blocks below step down in
           the requested priority order -- padding, then gap, then the
           sidebars -- each chained to the previous stage's own computed
           threshold. */
        .urbanum-shell-padding {
          padding-left: ${SHELL_HORIZONTAL_PADDING}px;
          padding-right: ${SHELL_HORIZONTAL_PADDING}px;
        }
        .urbanum-columns {
          gap: ${COLUMN_GAP}px;
        }
        .urbanum-sidebar-left {
          width: ${LEFT_SIDEBAR_WIDTH}px;
          min-width: ${LEFT_SIDEBAR_WIDTH}px;
          flex-shrink: 0;
        }
        /* Prototype review pass, round 3 (corrected hierarchy): CENTER and
           RIGHT SIDEBAR nested one level deeper, as urbanum-workspace's own
           two children, instead of both being direct children of
           urbanum-columns alongside LEFT -- see WORKSPACE_STACK_THRESHOLD's
           own comment above for why. flex: 1 + min-width: 0 here match
           what CENTER's own flex: 1 did in the outer row before; this
           Flex is simply standing in CENTER's old spot in that row, with
           CENTER and RIGHT now living inside it instead of beside it. */
        .urbanum-workspace {
          display: flex;
          flex: 1;
          min-width: 0;
          flex-direction: row;
          align-items: flex-start;
          gap: ${COLUMN_GAP}px;
        }
        .urbanum-workspace-center {
          flex: 1;
          min-width: ${CENTER_MIN_WIDTH}px;
        }
        .urbanum-sidebar-right {
          width: ${RIGHT_SIDEBAR_WIDTH}px;
          min-width: ${RIGHT_SIDEBAR_WIDTH}px;
          flex-shrink: 0;
        }
        /* RIGHT SIDEBAR's own internal column Flex (height: 100%, matching
           its row sibling CENTER) and its bottom-anchored action Box
           (marginTop: 'auto', pinning Continue/Publish to the column's
           bottom edge) both depend on RIGHT being a fixed-height row
           sibling inside urbanum-workspace. Moved out of inline style
           and into these two classes -- same reason the shell padding/gap/
           sidebar widths moved to classes earlier in this file -- so the
           WORKSPACE_STACK_THRESHOLD block below can override them once
           urbanum-workspace switches to column-direction and RIGHT is
           no longer in a row. */
        .urbanum-sidebar-right-inner {
          height: 100%;
          min-height: 320px;
        }
        .urbanum-sidebar-right-actions {
          margin-top: auto;
          padding-top: 24px;
          padding-bottom: 48px;
        }
        @media (max-width: ${OVERFLOW_THRESHOLD}px) {
          .urbanum-shell-padding {
            padding-left: ${COMPRESSED_SHELL_HORIZONTAL_PADDING}px;
            padding-right: ${COMPRESSED_SHELL_HORIZONTAL_PADDING}px;
          }
        }
        @media (max-width: ${GAP_COMPRESSED_THRESHOLD}px) {
          .urbanum-columns {
            gap: ${COMPRESSED_COLUMN_GAP}px;
          }
          .urbanum-workspace {
            gap: ${COMPRESSED_COLUMN_GAP}px;
          }
        }
        /* Prototype review pass, round 3: see WORKSPACE_STACK_THRESHOLD's
           own comment above. urbanum-workspace switches from a row
           (CENTER beside RIGHT) to a column (CENTER, then RIGHT directly
           beneath it) and gains a width ceiling -- max-width:
           CENTER_MIN_WIDTH -- so it stops growing to fill whatever LEFT
           doesn't use; align-items: stretch (the flex default, stated
           explicitly rather than left implicit) is what makes CENTER and
           RIGHT each fill that capped width edge-to-edge with each other,
           without being wider than it. CENTER's flex: 1 meant "grow
           horizontally to fill the row" in row-direction; in column-
           direction that same property would instead mean "grow
           vertically to fill the column," which isn't wanted here, so it's
           overridden to flex: none + width: 100% -- sized to its own
           content height, full width of the now-capped workspace. RIGHT's
           fixed pixel width is overridden the same way. The internal
           height-matching (urbanum-sidebar-right-inner) and bottom-
           anchor (urbanum-sidebar-right-actions) both stand down here
           too, for the same reason as before: once RIGHT is a stacked
           block instead of a row sibling, there's no shared row height to
           match and no "bottom edge" to anchor Continue/Publish to --
           height becomes intrinsic and the action Box gets an ordinary top
           margin instead of an auto-margin anchor. LEFT is untouched. */
        @media (max-width: ${WORKSPACE_STACK_THRESHOLD}px) {
          .urbanum-workspace {
            flex-direction: column;
            align-items: stretch;
            max-width: ${CENTER_MIN_WIDTH}px;
            gap: ${WORKSPACE_STACK_GAP}px;
          }
          .urbanum-workspace-center {
            flex: none;
            width: 100%;
            min-width: 0;
          }
          .urbanum-sidebar-right {
            width: 100%;
            min-width: 0;
            flex-shrink: 1;
          }
          .urbanum-sidebar-right-inner {
            height: auto;
            min-height: 0;
          }
          .urbanum-sidebar-right-actions {
            margin-top: 24px;
          }
        }
        /* The genuine last resort -- see LEFT_COMPRESS_THRESHOLD's own
           comment above. Only LEFT changes here; urbanum-workspace stays
           exactly as the stage above left it (stacked, capped at
           CENTER_MIN_WIDTH). */
        @media (max-width: ${LEFT_COMPRESS_THRESHOLD}px) {
          .urbanum-sidebar-left {
            width: ${COMPRESSED_LEFT_SIDEBAR_WIDTH}px;
            min-width: ${COMPRESSED_LEFT_SIDEBAR_WIDTH}px;
          }
        }
      `}</style>
      {/* Approved layout spec: a permanent three-column composition --
          LEFT SIDEBAR (workflow navigation, persistent) | CENTER (the
          active workspace -- content changes per step, page composition
          does not) | RIGHT SIDEBAR (contextual rail -- recovery, tips,
          the primary forward action, anchored toward the bottom). This
          replaces the earlier two-zone "room" composition; the shell
          itself (Container above: full-browser fill, no width cap) is
          unchanged, only what's arranged inside it.

          This Box is the non-scrolling home for the 32px edge padding
          (see the Container comment above) -- `height: '100%'` keeps the
          existing height chain intact (Container -> this Box -> the
          three-column Flex -> the RIGHT SIDEBAR's own column Flex ->
          its `marginTop: 'auto'` bottom-anchored button all still
          resolve the same as before; only the scroll/padding split
          changed, not the vertical layout). */}
      <Box className="urbanum-shell-padding" style={{height: '100%'}}>
      <Flex
        align="flex-start"
        className="urbanum-columns"
        style={{
          height: '100%',
          // Visual polish pass ("Steps 2-5: lower the content slightly"):
          // Type/Required/Optional/Review & Publish get a touch more top
          // padding than Upload and the post-publish Complete screen, so
          // the whole three-column composition sits a little lower and
          // breathes more. Applied here, on the single outer Flex all
          // three columns already share, rather than inside CENTER's own
          // per-step Stacks -- Step 1 and Step 2 render through the same
          // shared Stack (see below), so a per-step split there would
          // need new branching; this is the one shared ancestor where an
          // 8px conditional is the whole edit.
          paddingTop: ['archiveOrJournal', 'required', 'optional'].includes(step) ? 32 : 24,
          paddingBottom: 24,
        }}
      >
        {/* LEFT SIDEBAR -- persistent workflow navigation. Reuses
            STEP_SEQUENCE and the currentStepIndex/indicatorStepKey values
            already computed above (previously driving the old horizontal
            progress bar) -- same data, new presentation as a vertical
            step list. Not clickable: the underlying step machine is
            strictly forward-and-validated (unchanged, per the locked
            architecture), so this is orientation, not navigation. */}
        <Box className="urbanum-sidebar-left">
          <Stack space={4}>
            <Text size={0} style={kickerStyle}>
              Import Workflow
            </Text>
            <Stack space={1}>
              {STEP_SEQUENCE.map((entry, index) => {
                const isActive = entry.key === indicatorStepKey
                const isDone = step === 'complete' || index < currentStepIndex
                return (
                  <Flex
                    key={entry.key}
                    align="center"
                    gap={3}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 4,
                      backgroundColor: isActive ? 'rgba(17, 17, 17, 0.06)' : 'transparent',
                    }}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: `1px solid ${isActive || isDone ? INK : HAIRLINE}`,
                        flexShrink: 0,
                      }}
                    >
                      <Text size={0} style={{fontSize: '0.65rem', color: isActive || isDone ? INK : MUTED_INK}}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </Flex>
                    <Text
                      size={1}
                      style={{
                        color: isActive ? INK : isDone ? INK : MUTED_INK,
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {entry.label}
                    </Text>
                  </Flex>
                )
              })}
            </Stack>
          </Stack>
        </Box>

        {/* WORKSPACE -- prototype review pass, round 3: CENTER and RIGHT
            SIDEBAR, nested inside their own Flex so they can act as one
            adaptive unit (side-by-side on wide desktops, stacked -- capped
            to CENTER_MIN_WIDTH -- once WORKSPACE_STACK_THRESHOLD is
            crossed) while LEFT stays a plain, unwrapped sibling in the
            outer row throughout. See `.urbanum-workspace`'s own CSS
            comment above for the full mechanism. */}
        <Flex className="urbanum-workspace">

        {/* CENTER -- the active workspace. Every step renders into this
            same Box; only its contents change.

            Final UX polish pass ("Responsive center column"): `flex: 1`
            is unchanged -- CENTER is still the one flexible column --
            but `minWidth: 0` (which let it shrink all the way to zero
            as the browser narrowed, with the fixed-width sidebars never
            budging) is replaced with CENTER_MIN_WIDTH, a real floor. See
            that constant's own comment above for the full reasoning.

            Prototype review pass, round 3: `flex: 1` / `minWidth:
            CENTER_MIN_WIDTH` moved out of inline style and into the
            `.urbanum-workspace-center` class -- same reason as everywhere
            else in this file -- so WORKSPACE_STACK_THRESHOLD can override
            them once `.urbanum-workspace` is column-direction. */}
        <Box className="urbanum-workspace-center">

          {(step === 'upload' || step === 'archiveOrJournal') && (
            <Stack space={5} key={step} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
              {/* Round F ("Workflow hierarchy"): Upload keeps its full
                  kicker+Heading+description block exactly as before --
                  Step 1 is explicitly excluded from the heading
                  relocation ("Step 1 is fundamentally different... keep
                  the current layout"). Choose Type's own Heading and
                  description moved to the top of the RIGHT SIDEBAR (see
                  that Box's own comment below) so CENTER's large
                  image/uploader area can sit as high on the page as
                  possible from Step 2 onward -- only this small kicker
                  stays here, matching the "STEP 2 OF 5" line in the
                  user's own example. Round E's space increase (2 -> 4)
                  is otherwise unchanged for Upload. */}
              <Stack space={4}>
                <Text size={0} style={kickerStyle}>
                  Step {displayStepNumber} of {STEP_SEQUENCE.length}
                </Text>
                {step === 'upload' && (
                  <>
                    <Heading size={3} style={titleStyle}>
                      Upload Photos
                    </Heading>
                    <Text size={1} style={mutedTextStyle}>
                      Start by adding the photos you want to archive.
                    </Text>
                  </>
                )}
              </Stack>

              {/* Region 1 (Step: Upload). Drop / choose. The whole card
                  is clickable -- a single onClick on the outer Card
                  opens the hidden file input via the ref below, so the
                  icon, both lines of text, and the empty dashed space
                  all trigger the picker, not just the "Choose Images"
                  words. Drag-and-drop is untouched.

                  Visual-polish pass ("Upload Card"): background was
                  already transparent (the page's own #faf9f5 showing
                  through, not a white panel) -- what was missing was any
                  sense of depth. `shadow={0}` is kept (Card's own theme
                  shadow doesn't match this file's soft, custom shadow
                  language) and a small custom `boxShadow` is added
                  instead, at the same soft/diffuse quality ImagePanel's
                  photo frame already uses elsewhere in this file, just
                  lighter -- "the same visual language as the image
                  cards," restrained rather than decorative. `radius: 4`
                  now matches the thumbnail tiles' own corner radius
                  (Region 2 below), for the same reason. */}
              <Card
                radius={0}
                shadow={0}
                tone="default"
                className="urbanum-upload-card"
                style={{
                  border: `1px dashed ${HAIRLINE}`,
                  borderRadius: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  boxShadow: '0 8px 28px rgba(24, 28, 34, 0.05)',
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Stack space={4}>
                  <Flex justify="center">
                    <Text size={3} style={mutedTextStyle}>
                      <UploadIcon />
                    </Text>
                  </Flex>
                  <Stack space={2}>
                    <Text size={1} style={{color: INK}}>
                      Drop photos here
                    </Text>
                    <Text size={1} style={{color: MUTED_INK, fontSize: '0.72rem'}}>
                      or
                    </Text>
                    <Text size={1} style={{color: INK, textDecoration: 'underline'}}>
                      Browse files
                    </Text>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInputChange}
                      style={{display: 'none'}}
                    />
                  </Stack>
                </Stack>
              </Card>

              {/* Region 2 (Step: Upload). The import queue -- moved here
                  from the old two-zone model's left rail, restyled from a
                  vertical list-with-status-text into the mockup's
                  thumbnail grid. Same `queueItems` data, same statuses;
                  only the visual treatment changed. Per-item removal
                  (the "x" on each tile) is new -- a direct, minimal
                  consumer of the existing `setQueueItems` setter (the
                  same one `handleFiles` already uses), not a new handler
                  or new state; removing an in-flight upload is safe
                  because `handleFiles`'s own `.then()` callback already
                  no-ops harmlessly if its id no longer matches anything
                  in state. "Clear all" is the same setter called with an
                  empty array. */}
              {queueItems.length > 0 && (
                <Stack space={3}>
                  <Flex wrap="wrap" gap={3}>
                    {queueItems.map((item) => (
                      <Box key={item.id} style={{position: 'relative', width: 96, height: 96}}>
                        <Box
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: 'var(--card-muted-bg-color)',
                          }}
                        >
                          {item.status === 'uploaded' && item.asset && (
                            <img
                              src={item.asset.url}
                              alt=""
                              style={{objectFit: 'cover', width: '100%', height: '100%'}}
                            />
                          )}
                          {item.status === 'uploading' && (
                            <Flex align="center" justify="center" style={{width: '100%', height: '100%'}}>
                              <Text size={0} style={hintTextStyle}>
                                Uploading…
                              </Text>
                            </Flex>
                          )}
                          {item.status === 'error' && (
                            <Flex align="center" justify="center" style={{width: '100%', height: '100%'}}>
                              <Text size={0} style={errorTextStyle}>
                                Failed
                              </Text>
                            </Flex>
                          )}
                        </Box>
                        <Button
                          icon={undefined}
                          text="×"
                          mode="bleed"
                          tone="default"
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            minWidth: 22,
                            height: 22,
                            padding: 0,
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            boxShadow: '0 1px 4px rgba(17, 17, 17, 0.25)',
                          }}
                          onClick={() =>
                            setQueueItems((prev) => prev.filter((queued) => queued.id !== item.id))
                          }
                        />
                      </Box>
                    ))}
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text size={1} style={mutedTextStyle}>
                      {queueItems.length === 1 ? '1 photo selected' : `${queueItems.length} photos selected`}
                    </Text>
                    <Button
                      text="Clear all"
                      mode="bleed"
                      tone="default"
                      style={{...secondaryButtonStyle, fontWeight: 400}}
                      onClick={() => setQueueItems([])}
                    />
                  </Flex>
                </Stack>
              )}

              {isCreatingDrafts && (
                <Flex justify="center">
                  <Text size={1} style={mutedTextStyle}>
                    Creating draft{queueItems.filter((i) => i.status === 'uploaded').length > 1 ? 's' : ''}…
                  </Text>
                </Flex>
              )}
              {draftCreationError && <Text size={1} style={errorTextStyle}>{draftCreationError}</Text>}
            </Stack>
          )}

          {/* CENTER content for the Required/Optional steps -- visual-
              polish pass ("Move the metadata into the right sidebar"):
              this is now deliberately minimal. It used to also render
              the entire Project/Theme/Location/Date/Caption field
              stack directly beneath ImagePanel; that content moved,
              unchanged, into the RIGHT SIDEBAR below (search this file
              for "Move the metadata into the right sidebar" to find it)
              so everything needed to finish a step -- the photo, its
              fields, and the primary action -- fits above the fold
              together instead of pushing the page vertically. CENTER
              now shows only the image, plus a secondary nav action
              (Back/Cancel Import) on Optional only -- Round E moved
              Required's own Cancel Import into the RIGHT SIDEBAR,
              directly beneath Continue (see below), so CENTER on
              Required is just the heading and the photo. The primary
              action (Continue/Publish) lives at the bottom of the RIGHT
              SIDEBAR, as it already did before this pass. Every
              handler/disabled condition/validation rule is byte-for-byte
              the same as before; only which Box renders each piece
              changed. */}
          {(step === 'required' || step === 'optional') && currentDraft && (
            <Stack space={5} key={step} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
              {/* Round F ("Workflow hierarchy"): "Required"/"Optional"
                  used to render here as a full Heading, directly under
                  this same kicker. That Heading (now worded "Required
                  Metadata"/"Optional Metadata") moved to the top of the
                  RIGHT SIDEBAR along with Choose Type's (see that Box's
                  own comment below) -- CENTER keeps only the kicker, so
                  the image beneath it stays the dominant, highest thing
                  on the page from Step 2 on, per "the large image/
                  uploader area should become the dominant visual
                  element and remain as high on the page as possible." */}
              <Text size={0} style={kickerStyle}>
                Step {displayStepNumber} of {STEP_SEQUENCE.length}
              </Text>

              {/* Round F ("Continue / Cancel" / CENTER heading strip):
                  Optional's own Back/Cancel Import used to render here,
                  directly beneath the image -- moved to the bottom-
                  anchored RIGHT SIDEBAR Box, paired beneath Publish, for
                  the same "one decision pair, always visible without
                  scrolling" reasoning Round E already applied to
                  Required's Continue/Cancel (see that Box's own comment
                  further down). CENTER now shows only the kicker and the
                  photo for both Required and Optional. */}
              <ImagePanel url={activeThumbnailUrl} />
            </Stack>
          )}

                {/* Region 6 (Step: Complete). Only ever reached once every
                photo goToNextDraftOrComplete was tracking has been
                published -- `batchCount` still reports exactly how many
                that was. All three choices reduce to the exact same
                handleStartOver reset -- the wording differs for the
                user's benefit, the resulting state doesn't. Nothing here
                navigates into Studio's document editor or anywhere else --
                the guided workflow stays fully self-contained from Upload
                through here.

                Visual-language pass: this used to read as a distinct
                "you're done" certificate -- a loud Heading, a kicker
                labeling it "Import Complete," a centered divider rule
                separating the news from the next step, like a receipt.
                That's the opposite of "part of the workspace." Downweighted
                to the same quiet kicker+text vocabulary the rest of this
                screen already uses (no more Heading, no divider rule).
                Whether this screen should exist at all is still an open
                question -- this only makes the version that exists today
                feel native; it isn't a redesign of the flow.

                UI polish pass ("Publish confirmation layout"): the block
                itself (kicker/subtext/buttons together) is now centered
                as a unit within CENTER -- wrapped in a Flex with
                justify="center" below, sized to its own content rather
                than stretched full-width, so the block sits in the
                middle of the column. Nothing inside the block changed:
                the kicker and subtext are still plain left-aligned
                Text, and the two buttons are still the same side-by-
                side Flex with the same gap -- only where that whole
                unit sits horizontally changed. */}
          {/* Final UX polish pass ("Completion screen"): the previous
              three equal-weight choices (Archive More/Journal More/
              Finish for Now) all reduced to the same handleStartOver
              reset -- they existed only because there was no other way
              back into the workflow's other destinations. Now that
              Import/Archive/Settings are real header navigation (see
              UrbanumNavbar.jsx), this screen no longer needs to be the
              only way to get anywhere: Upload More is the one forward
              action (same reset as before, just one button instead of
              three near-duplicates), and View Archive goes to Archive
              Items -- DEFAULT_ARCHIVE_TOOL_NAME, see archiveSections.js --
              via handleViewLibrary/router.navigateUrl rather than
              StateLink, since this screen renders inside RouteScope (see
              the comment at the top of this component). */}
          {step === 'complete' && (
              // Visual polish pass ("Publish confirmation screen," round
              // 2): ~50px of top padding on this Flex -- the same
              // wrapper justify="center" already centers the block
              // through -- moves the whole confirmation composition
              // (headline, status text, description, buttons) down into
              // the available whitespace, without touching anything
              // inside the Stack itself (typography/spacing/buttons all
              // unchanged).
              <Flex justify="center" style={{width: '100%', paddingTop: 50}}>
                <Stack space={5} key="complete" style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                  {/* Visual polish pass ("Publish confirmation screen"): a
                      proper headline, so this reads as a destination
                      rather than a status line -- same Heading treatment
                      (size={3}, titleStyle) already used for Step 1's
                      "Upload Photos" CENTER heading, for consistency.
                      The kicker/subtext below are unchanged, just now
                      framed by a headline above them. */}
                  <Heading size={3} style={titleStyle}>
                    Published
                  </Heading>
                  <Stack space={2}>
                    <Text size={0} style={kickerStyle}>
                      {batchCount === 1 ? '1 photo published' : `${batchCount} photos published`}
                    </Text>
                    <Text size={1} style={mutedTextStyle}>
                      Everything from this session is now live in the archive.
                    </Text>
                  </Stack>

                  <Flex gap={3} wrap="wrap" align="center">
                    <Button
                      text="Upload More →"
                      mode="default"
                      tone="default"
                      style={{...primaryButtonStyle, ...solidActionStyle}}
                      onClick={handleStartOver}
                    />
                    <button
                      type="button"
                      style={navLinkButtonStyle}
                      onClick={handleViewLibrary}
                    >
                      View Archive
                    </button>
                  </Flex>
                </Stack>
              </Flex>
          )}
        </Box>

        {/* RIGHT SIDEBAR -- the permanent contextual rail. Mockup: "Continue
            Previous, Tips, Primary Continue button" now, "AI suggestions,
            session information, warnings, import status, publishing state"
            later -- only the first three are built here, since only the
            Upload screen of the mockup exists; nothing beyond it is
            invented. Reuses hasPendingDrafts/pendingDrafts/
            handleContinueEditing exactly as they already existed (no new
            state), and the same handleChooseType/handleSaveRequired/
            handleSaveOptional handlers and disabled conditions the old
            in-column buttons used, just relocated here as this column's
            bottom-anchored primary action, per "the Continue button should
            remain visually anchored toward the bottom of this column." */}
        <Box className="urbanum-sidebar-right">
          <Flex direction="column" className="urbanum-sidebar-right-inner">
            <Stack space={4}>
              {/* Round F ("Workflow hierarchy"): the instructional heading
                  for every step from Choose Type onward now lives here,
                  at the very top of the RIGHT SIDEBAR, instead of above
                  the image/uploader in CENTER (which now shows only a
                  small step-number kicker -- see CENTER's own comments).
                  Step 1 (Upload) is deliberately excluded: its heading
                  stays exactly where it was, above the uploader, per
                  "Step 1 is fundamentally different... keep the current
                  layout." "Optional Information" becomes "Review & Publish"
                  for the moment a publish is actually in flight -- the
                  same indicatorStepKey/isPublishing distinction the LEFT
                  SIDEBAR's own step list already uses, just reflected in
                  this heading's wording too now. */}
              {/* Round G ("Typography polish"): purely spacing/line-height,
                  no structural change. Heading-to-subheading grew from
                  space={2} (8px) to space={3} (12px); an explicit
                  marginBottom nudges the gap after this block (before
                  the Archive Item/Journal Entry buttons below) a bit
                  past what the outer Stack's own space={4} already
                  gives it. The kicker ("Step X of 5") isn't part of this
                  block -- it lives in CENTER, not this sidebar, per the
                  heading-relocation rule Round F established ("the
                  large image/uploader area should become the dominant
                  visual element and remain as high on the page as
                  possible"); the two aren't vertically stacked anywhere
                  on the page, so there's no single gap between them left
                  to widen without reintroducing a kicker here, which
                  would be a layout change, not a typography one. */}
              {/* UI polish pass ("Sidebar heading spacing"): still read as
                  compressed after the pass above, so two further, purely
                  spacing/line-height changes, scoped to just this
                  sidebar block:
                  -- The Heading's line-height goes from titleStyle's own
                  1.25 to 1.4 here, via a local override rather than
                  raising titleStyle itself -- titleStyle is also shared
                  by Step 1's own heading in CENTER (see above), which
                  this pass doesn't touch, so only this sidebar copy
                  changes.
                  -- Heading-to-subheading space goes from space={3}
                  (12px) to space={5} (20px) -- a clearer, more
                  editorial jump than another single-step nudge, still
                  using the same spacing scale as everywhere else in
                  this file rather than an arbitrary pixel value.
                  Font size, weight, and alignment are all unchanged. */}
              {(step === 'archiveOrJournal' || step === 'required' || step === 'optional') && (
                <Stack space={5} style={{marginBottom: 8}}>
                  <Heading size={3} style={{...titleStyle, lineHeight: 1.4}}>
                    {step === 'archiveOrJournal'
                      ? 'Choose Type'
                      : step === 'required'
                        ? 'Required Information'
                        : isPublishing
                          ? 'Review & Publish'
                          : currentDraft?.type === 'journalEntry'
                            ? 'Image Caption'
                            : 'Optional Information'}
                  </Heading>
                  {step === 'archiveOrJournal' && (
                    <Text size={1} style={{...mutedTextStyle, lineHeight: 1.5}}>
                      Choose how these photos should be catalogued.
                    </Text>
                  )}
                </Stack>
              )}

              {/* Round F ("Step 2 button hierarchy"): Archive Item stays
                  the filled primary button (solidActionStyle); Journal
                  Entry now uses the lighter secondary/inverse treatment
                  instead of matching it -- "subtly communicates the
                  preferred workflow without forcing a default selection."
                  Round F ("Continue / Cancel"): Step 2's own Continue/
                  Cancel pairing is removed entirely -- choosing either
                  button IS the action, there's nothing left to confirm or
                  back out of at this exact moment (Cancel Import is still
                  reachable from every later step). Handlers/disabled
                  conditions on both buttons are otherwise byte-for-byte
                  unchanged. */}
              {step === 'archiveOrJournal' && (
                <Stack space={3}>
                  <Button
                    text={isCreatingDrafts && pendingChooseType === 'archiveItem' ? 'Creating…' : 'Archive Item →'}
                    mode="default"
                    tone="default"
                    disabled={isCreatingDrafts}
                    style={{...primaryButtonStyle, ...solidActionStyle, width: '100%'}}
                    onClick={() => {
                      setPendingChooseType('archiveItem')
                      handleChooseType('archiveItem')
                    }}
                  />
                  <button
                    type="button"
                    disabled={isCreatingDrafts}
                    style={{
                      ...inverseButtonStyle,
                      opacity: isCreatingDrafts ? 0.5 : 1,
                      cursor: isCreatingDrafts ? 'default' : 'pointer',
                    }}
                    onClick={() => {
                      setPendingChooseType('journalEntry')
                      handleChooseType('journalEntry')
                    }}
                  >
                    {isCreatingDrafts && pendingChooseType === 'journalEntry' ? 'Creating…' : 'Photo Journal →'}
                  </button>
                </Stack>
              )}

              {/* Tips -- static mockup copy. Shown only on Upload, the one
                  screen the mockup actually designed; no Required/
                  Optional/Complete tip copy is invented here. */}
              {step === 'upload' && (
                <Card
                  padding={4}
                  radius={0}
                  shadow={0}
                  tone="default"
                  style={{border: `1px solid ${HAIRLINE}`, backgroundColor: 'transparent'}}
                >
                  <Stack space={3}>
                    <Text size={0} style={kickerStyle}>
                      Tips
                    </Text>
                    <Text size={1} style={mutedTextStyle}>
                      You can add more details after publishing, or return later to organize.
                    </Text>
                  </Stack>
                </Card>
              )}

              {/* Visual-polish pass ("Move the metadata into the right
                  sidebar"): this is the exact same Required/Optional
                  editing surface that used to render underneath
                  ImagePanel in CENTER -- every field, handler, validation
                  rule, and comment below is unchanged, only relocated.
                  CENTER now shows just the image on Required (Round E
                  moved its Cancel Import into this sidebar too -- see
                  above), and the image plus a secondary Back/Cancel
                  Import on Optional; this card-less block is where the
                  fields that make up "completing this step" live, right
                  beside the bottom-anchored primary action below, so
                  everything needed to finish the step is visible
                  together without scrolling past the photo. */}
              {(step === 'required' || step === 'optional') && currentDraft && (
                <Stack space={7} key={step} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                  {step === 'required' ? (
                    <Stack space={5}>
                      {requiredSaveError && <Text size={1} style={errorTextStyle}>{requiredSaveError}</Text>}
                      {requiredLoadError && <Text size={1} style={errorTextStyle}>{requiredLoadError}</Text>}

                      {/* Milestone 5 ("one interaction language, not
                          one control"): Project and Theme below
                          both now render through the same
                          AnnotationField (components/AnnotationField.jsx)
                          -- type, see suggestions, Enter attaches an
                          existing one or creates it if there isn't one,
                          everything becomes a chip, removing is always
                          a chip click or Backspace. Their schemas stay
                          exactly what they were (Project a single
                          reference, Theme a reference array) -- only
                          `multiple` differs between the two call sites
                          below. The old separate "+ New Project"/"+ New
                          Theme" mini-forms are gone entirely, not hidden --
                          AnnotationField's own trailing "Create" row
                          does that job now, for both fields, the
                          same way. handleCreateProject/handleCreateTheme
                          still do the actual client.create() calls and
                          the same existing-title dedupe they always
                          did; only what triggers them changed, from a
                          "Create" button reading its own mini-form
                          state, to AnnotationField's onCreate callback
                          handing over the typed text directly.

                          Labels below are reworded from noun ("Project")
                          to verb-phrase ("Attached to") -- agreed in
                          the design discussion that shaped this
                          milestone: a label naming what's *happening to
                          the photograph* reads as an annotation, a
                          label naming *a field on a record* reads as a
                          form. They can't disappear the same way
                          Description's did (no label at all) -- a bare
                          row of chips doesn't say on its own whether
                          it's a Project or a Theme; the label is still the
                          only thing telling the similarly-shaped
                          chip groups apart. */}
                      <Stack space={2}>
                        <FieldLabel>Project</FieldLabel>
                        <AnnotationField
                          id="required-project"
                          label="Project"
                          placeholder="Type a project name…"
                          items={
                            requiredProject
                              ? [{id: requiredProject._id, label: requiredProject.title}]
                              : []
                          }
                          suggestions={(availableProjects || []).map((project) => ({
                            id: project._id,
                            label: project.title,
                          }))}
                          multiple={false}
                          creating={isSavingNewProject}
                          onAttach={(item) => {
                            // Attaching an existing suggestion is never
                            // the "new Project" branch -- see
                            // handleCreateProject's own existing-title
                            // match for the other place this same flag
                            // is kept in sync.
                            setRequiredProject({_id: item.id, title: item.label})
                            setIsNewProject(false)
                            // Required-Information surfacing fix: seeds
                            // Type from whatever this Project already has
                            // (see the fetch effect above, which now
                            // selects it) -- `item` itself only carries
                            // {id, label} (AnnotationField's own
                            // normalized shape), not the full Project
                            // record, so this looks the match back up in
                            // availableProjects. Same lookup as
                            // handleCreateProject's existing-title match
                            // and applySessionContext below, kept
                            // consistent across all three attach paths.
                            const matchedProject = (availableProjects || []).find(
                              (project) => project._id === item.id,
                            )
                            setRequiredType(
                              matchedProject?.projectType
                                ? {_id: matchedProject.projectType._id, title: matchedProject.projectType.title}
                                : null,
                            )
                          }}
                          onCreate={handleCreateProject}
                          onRemove={() => {
                            setRequiredProject(null)
                            setIsNewProject(false)
                            setNewProjectLocation('')
                            setNewProjectDate('')
                            // Type CMS authoring pass: resets alongside
                            // the rest of the New Project workflow's own
                            // state above, for the same reason -- see
                            // requiredType's own declaration comment.
                            setRequiredType(null)
                            setNewTypeError(null)
                          }}
                          className="urbanum-field"
                          style={quietFieldStyle}
                        />
                        {newProjectError && (
                          <Text size={1} style={errorTextStyle}>
                            {newProjectError}
                          </Text>
                        )}
                        {availableProjects !== null && availableProjects.length === 0 && (
                          <Text size={1} style={hintTextStyle}>
                            No Projects exist yet — type a name above to create one.
                          </Text>
                        )}
                      </Stack>

                      {/* Required-Information surfacing fix: Type used to
                          live entirely inside the isNewProject-gated "New
                          Project workflow" block below, which meant it
                          only ever rendered for a Project just created in
                          this exact session -- attaching an EXISTING
                          Project (the overwhelming common case) hid the
                          control completely, which is the reported bug
                          this fix addresses. Type is a Project-level
                          field (like Location/Year below), but unlike
                          them it needs to be visible and usable for every
                          Project, new or existing -- so it gets its own
                          block here, gated the same way Theme's own block
                          below is (`{requiredProject && (...)}`, no
                          isNewProject condition), positioned right after
                          Project since it's a property of the Project
                          just attached. Existing-Project selection/
                          creation is wired the same way it always was
                          (same AnnotationField, same handleCreateType) --
                          only the render condition changed. What's
                          selected here is seeded from whatever the
                          attached Project already has (see the Project
                          AnnotationField's own onAttach, handleCreateProject's
                          existing-title match, and applySessionContext,
                          all above) and persisted by its own dedicated
                          patch in handleSaveOptional below, independent of
                          the isNewProject-only Location/Year patch --
                          preserving the internal distinction that Type
                          lives on Project, not on the Archive Item draft,
                          while no longer hiding the control behind
                          "brand-new Project" state. */}
                      {requiredProject && (
                        <Stack space={2} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                          <FieldLabel>Type</FieldLabel>
                          <AnnotationField
                            id="required-type"
                            label="Type"
                            placeholder="Type a project type…"
                            items={requiredType ? [{id: requiredType._id, label: requiredType.title}] : []}
                            suggestions={(availableTypes || []).map((type) => ({
                              id: type._id,
                              label: type.title,
                            }))}
                            multiple={false}
                            creating={isSavingNewType}
                            onAttach={(item) => setRequiredType({_id: item.id, title: item.label})}
                            onCreate={handleCreateType}
                            onRemove={() => setRequiredType(null)}
                            className="urbanum-field"
                            style={quietFieldStyle}
                          />
                          {newTypeError && (
                            <Text size={1} style={errorTextStyle}>
                              {newTypeError}
                            </Text>
                          )}
                          {availableTypes !== null && availableTypes.length === 0 && (
                            <Text size={1} style={hintTextStyle}>
                              No Types exist yet — type a name above to create one.
                            </Text>
                          )}
                        </Stack>
                      )}

                      {/* UX pass ("New Project workflow"): reveals only
                          once handleCreateProject has just created a
                          brand-new Project document for this Archive
                          Item (isNewProject) -- never for an existing,
                          previously-published Project. No explanatory
                          copy, per the brief: the section's own
                          appearance under a freshly-attached Project is
                          what communicates "this is new." Same quiet
                          TextInput treatment as Optional's own Location/
                          Year fields below, so it reads as the same
                          uploader, not a new form bolted on. Values here
                          are plain local state -- see handleSaveOptional
                          for where and when they're actually written.
                          Type used to be rendered inside this section too
                          -- it now has its own always-visible block above
                          (see that block's own comment for why); only
                          Location/Project Date remain here, since those
                          two genuinely are only ever set at Project-
                          creation time. */}
                      {requiredProject && isNewProject && (
                        <Stack space={2} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                          <SectionHeading>New Project</SectionHeading>
                          <Flex gap={6} wrap="wrap">
                            <Box style={{flex: 1, minWidth: 200}}>
                              <Stack space={2}>
                                <FieldLabel quiet>Location</FieldLabel>
                                <TextInput
                                  {...noBrowserAutofillProps}
                                  value={newProjectLocation}
                                  placeholder="Where is this project?"
                                  className="urbanum-field urbanum-field-recede"
                                  style={quietFieldStyle}
                                  onChange={(event) => setNewProjectLocation(event.currentTarget.value)}
                                />
                              </Stack>
                            </Box>
                            <Box style={{flex: 1, minWidth: 160}}>
                              <Stack space={2}>
                                <FieldLabel quiet>Project Date</FieldLabel>
                                <TextInput
                                  {...noBrowserAutofillProps}
                                  type="number"
                                  value={newProjectDate}
                                  placeholder="Year"
                                  className="urbanum-field urbanum-field-recede"
                                  style={quietFieldStyle}
                                  onChange={(event) => setNewProjectDate(event.currentTarget.value)}
                                />
                              </Stack>
                            </Box>
                          </Flex>
                        </Stack>
                      )}

                      {/* Phase 4 ("progressive disclosure"): Theme
                          doesn't exist on screen at all until a
                          Project is attached -- "Project is the
                          anchor, everything else flows from it," per
                          the brief. This is the same AnnotationField,
                          same handlers, same data; the only thing that
                          changed is when React first mounts it. Reuses
                          the existing urbanumStepIn keyframe (already
                          defined in the <style> block above) rather
                          than adding a new animation -- "the same
                          restrained motion language already
                          established." One incidental benefit worth
                          naming: AnnotationField already focuses its
                          own input on mount (it needed that for
                          Project's chip-removed-so-input-reappears
                          case), so attaching a Project and pressing
                          Enter lands the cursor here automatically --
                          the keyboard flow carries across the reveal
                          without any new code for it. */}
                      {requiredProject && (
                      <Stack space={2} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                        <FieldLabel>Theme</FieldLabel>
                        {/* Phase 5's "Recent in this batch" row --
                            recentThemeSuggestions is a frozen snapshot
                            seeded once when this photo opened (see
                            applySessionContext), so tapping one of
                            these never shrinks or reorders the row --
                            someone can tap Materiality, then Courtyard,
                            then Threshold in quick succession without
                            the targets moving under their cursor. Not
                            filtered by what's already attached, for the
                            same reason: an already-attached suggestion
                            just becomes a no-op tap (onAttach's own
                            dedupe already guards that), which is a
                            calmer outcome than the row visibly changing
                            shape mid-tap. The heading text above this
                            row ("Recent in this batch") is gone --
                            the pills sit directly under the field they
                            belong to, and the selected-tone swap below
                            is still the only feedback needed for
                            "already attached." */}
                        {recentThemeSuggestions.length > 0 && (
                          <Flex wrap="wrap" gap={2}>
                            {recentThemeSuggestions.map((suggestion) => {
                              const attached = requiredThemeIds.includes(suggestion.id)
                              return (
                                <Button
                                  key={suggestion.id}
                                  text={suggestion.label}
                                  mode="bleed"
                                  tone="default"
                                  style={{fontWeight: 400, ...(attached ? selectedChipStyle : {})}}
                                  onClick={() =>
                                    setRequiredThemeIds((prev) =>
                                      prev.includes(suggestion.id)
                                        ? prev
                                        : [...prev, suggestion.id],
                                    )
                                  }
                                />
                              )
                            })}
                          </Flex>
                        )}
                        <AnnotationField
                          id="required-theme"
                          label="Theme"
                          placeholder="Type a theme…"
                          items={requiredThemeIds.map((id) => {
                            const theme = (availableThemes || []).find((t) => t._id === id)
                            return {id, label: theme ? theme.title : id}
                          })}
                          suggestions={(availableThemes || []).map((theme) => ({
                            id: theme._id,
                            label: theme.title,
                          }))}
                          multiple
                          creating={isSavingNewTheme}
                          onAttach={(item) =>
                            setRequiredThemeIds((prev) =>
                              prev.includes(item.id) ? prev : [...prev, item.id],
                            )
                          }
                          onCreate={handleCreateTheme}
                          onRemove={(item) =>
                            setRequiredThemeIds((prev) => prev.filter((id) => id !== item.id))
                          }
                          className="urbanum-field"
                          style={quietFieldStyle}
                        />
                        {newThemeError && (
                          <Text size={1} style={errorTextStyle}>
                            {newThemeError}
                          </Text>
                        )}
                        {availableThemes !== null && availableThemes.length === 0 && (
                          <Text size={1} style={hintTextStyle}>
                            No Themes exist yet — type a name above to create one.
                          </Text>
                        )}
                      </Stack>
                      )}

                      {/* Phase 4: the subtle divider still reveals once
                          every required field is satisfied -- Continue
                          itself lives at the bottom of this column (see
                          below), so this divider is the on-screen signal
                          that the step is complete and Continue is about
                          to appear beneath it. */}
                      {requiredComplete && (
                        <Box
                          style={{
                            borderTop: `1px solid ${HAIRLINE}`,
                            animation: 'urbanumStepIn 280ms ease-out',
                          }}
                        />
                      )}
                    </Stack>
                  ) : currentDraft.type === 'archiveItem' ? (
                    // Final UX polish pass ("Optional page bottom spacing"):
                    // space reduced from 7 (84px) to 4 (20px) -- this is
                    // the gap between the Location/Date/Caption cluster
                    // and the Featured/Sort Order/Notes accordion (or its
                    // collapsed toggle) below it, reported as an
                    // "unnecessary vertical gap." Nothing inside either
                    // cluster changed, only the space between them.
                    // Round E: reduced again, 4 (20px) -> 3 (12px) -- still
                    // reported as an unnecessary gap after the first pass.
                    <Stack space={3}>
                      {optionalSaveError && <Text size={1} style={errorTextStyle}>{optionalSaveError}</Text>}
                      {publishError && <Text size={1} style={errorTextStyle}>{publishError}</Text>}

                      {/* Story cluster -- no heading rule (whitespace
                          groups it, same as before), and now uses the
                          horizontal composition the frozen design
                          direction explicitly reserves for Optional
                          (Required stays a vertical editorial
                          sequence; Optional's Location/Date are two
                          short, atomic values well suited to sitting
                          side by side). Caption is pulled out of
                          the row and given real visual weight below it
                          -- per the frozen brief, Caption should read
                          as closer to the photograph's own caption
                          than to administrative metadata, so it's
                          larger and unhurried, not one more field in
                          the stack. */}
                      <Stack space={5}>
                        <Flex gap={6} wrap="wrap">
                          <Box style={{flex: 1, minWidth: 200}}>
                            <Stack space={2}>
                              <FieldLabel quiet>Location</FieldLabel>
                              <TextInput
                                {...noBrowserAutofillProps}
                                value={optionalLocation}
                                placeholder="Where was this taken?"
                                className="urbanum-field urbanum-field-recede"
                                style={quietFieldStyle}
                                onChange={(event) => setOptionalLocation(event.currentTarget.value)}
                              />
                            </Stack>
                          </Box>
                          <Box style={{flex: 1, minWidth: 220}}>
                            <Stack space={2}>
                              <FieldLabel quiet>Date</FieldLabel>
                              <Flex gap={3}>
                                <Box flex={1}>
                                  <TextInput
                                    {...noBrowserAutofillProps}
                                    type="number"
                                    value={optionalYear}
                                    placeholder="Year"
                                    className="urbanum-field urbanum-field-recede"
                                    style={quietFieldStyle}
                                    onChange={(event) => setOptionalYear(event.currentTarget.value)}
                                  />
                                </Box>
                                <Box flex={1}>
                                  <TextInput
                                    {...noBrowserAutofillProps}
                                    type="date"
                                    value={optionalFullDate}
                                    className="urbanum-field urbanum-field-recede"
                                    style={quietFieldStyle}
                                    onChange={(event) => setOptionalFullDate(event.currentTarget.value)}
                                  />
                                </Box>
                              </Flex>
                            </Stack>
                          </Box>
                        </Flex>

                        {/* Description: "a caption," per the brief --
                            no FieldLabel at all (a real caption
                            doesn't announce itself as one), no box, a
                            placeholder that reads like an invitation
                            rather than an instruction. Sized up from
                            the rest of Optional's fields so it reads
                            as the photograph's own caption, not one
                            more administrative value. */}
                        <TextArea
                          {...noBrowserAutofillProps}
                          value={optionalDescription}
                          rows={3}
                          placeholder="Add a caption…"
                          className="urbanum-field urbanum-field-recede"
                          style={{...captionFieldStyle, fontSize: '1.05rem'}}
                          onChange={(event) => setOptionalDescription(event.currentTarget.value)}
                        />
                      </Stack>

                      {/* Phase 4 ("progressive disclosure"): Display
                          and Notes are what the brief calls
                          "administrative controls" -- Featured, Sort
                          Order, and Internal Notes operate the archive
                          rather than describe the photograph, so they
                          stay collapsed behind one quiet toggle until
                          deliberately opened, instead of arriving
                          alongside Location/Date/Caption as if all six
                          fields carried equal weight. Nothing about
                          Display or Notes below changed -- same
                          fields, same handlers, same comments -- only
                          whether they're on screen by default. Not
                          reusing the old "+ New Project" style button
                          styling by accident: it's the same quiet
                          bleed-mode text-button vocabulary already
                          established for a small, secondary reveal
                          action elsewhere in this file. Collapses
                          again automatically on the next photo (see
                          resetDraftFields) -- every photo starts this
                          chapter closed, the same way Theme
                          above starts unrevealed on every photo. */}
                      {showAdministrative ? (
                        <>
                          <Flex gap={6} wrap="wrap" style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                            <Box style={{flex: 1, minWidth: 220}}>
                              <Stack space={2}>
                                <FieldLabel quiet>Featured</FieldLabel>
                                <Flex gap={2}>
                                  {['Default', 'Featured', 'Hidden'].map((option) => {
                                    const selected = optionalDisplayRole === option
                                    return (
                                      <Button
                                        key={option}
                                        text={option}
                                        mode={selected ? 'ghost' : 'bleed'}
                                        tone="default"
                                        style={{
                                          fontWeight: selected ? 500 : 400,
                                          ...(selected ? {borderColor: INK, color: INK} : {}),
                                        }}
                                        onClick={() => setOptionalDisplayRole(option)}
                                      />
                                    )
                                  })}
                                </Flex>
                              </Stack>
                            </Box>

                            <Box style={{flex: 1, minWidth: 200}}>
                              <Stack space={2}>
                                <FieldLabel quiet>Sort Order</FieldLabel>
                                <TextInput
                                  {...noBrowserAutofillProps}
                                  type="number"
                                  value={optionalSortOrder}
                                  placeholder="Lower numbers appear first"
                                  className="urbanum-field urbanum-field-recede"
                                  style={quietFieldStyle}
                                  onChange={(event) => setOptionalSortOrder(event.currentTarget.value)}
                                />
                              </Stack>
                            </Box>
                          </Flex>

                          <Stack space={2} style={{animation: 'urbanumStepIn 280ms ease-out'}}>
                            <FieldLabel quiet>Internal Notes</FieldLabel>
                            <TextArea
                              {...noBrowserAutofillProps}
                              value={optionalPrivateNotes}
                              rows={3}
                              placeholder="Never shown publicly"
                              className="urbanum-field"
                              style={noteFieldStyle}
                              onChange={(event) => setOptionalPrivateNotes(event.currentTarget.value)}
                            />
                          </Stack>
                        </>
                      ) : (
                        <Flex justify="flex-start">
                          <Button
                            text="+ Featured, Sort Order & Notes"
                            mode="bleed"
                            tone="default"
                            style={{...secondaryButtonStyle, fontSize: '0.68rem'}}
                            onClick={() => setShowAdministrative(true)}
                          />
                        </Flex>
                      )}
                    </Stack>
                  ) : (
                    <Stack space={4}>
                      {optionalSaveError && <Text size={1} style={errorTextStyle}>{optionalSaveError}</Text>}
                      {publishError && <Text size={1} style={errorTextStyle}>{publishError}</Text>}
                      {/* Journal Entry's one Optional field: Image
                          Caption (see journalEntryType.js -- the
                          schema's only public, editorially-relevant
                          Optional field on this document type today).
                          Same unboxed quiet-field chrome
                          (quietFieldStyle) already used for Location
                          above, with its own FieldLabel since, unlike
                          Archive Item's own caption field, this one
                          isn't the single obvious thing on the step --
                          it needs a label to be legible on its own.
                          rows={2} matches the schema field's own
                          `rows: 2`. */}
                      <Stack space={2}>
                        <FieldLabel quiet>Optional</FieldLabel>
                        <TextArea
                          {...noBrowserAutofillProps}
                          value={optionalCaption}
                          rows={2}
                          placeholder="Add a caption…"
                          className="urbanum-field urbanum-field-recede"
                          style={quietFieldStyle}
                          onChange={(event) => setOptionalCaption(event.currentTarget.value)}
                        />
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>

            {/* Primary forward action -- the one thing this column always
                anchors to its bottom edge. Varies by step, same as the
                buttons it replaced did; Complete has no single "continue"
                (its two choices are equal-weight alternates, unchanged
                in CENTER above), so nothing renders here on that step.

                Final UX polish pass ("Optional page bottom spacing"):
                added paddingBottom so Publish (and every other primary
                action here) always keeps real breathing room beneath it
                -- previously the only space below it came from the
                three-column Flex's own outer paddingBottom (24px),
                which reads as comfortable when this column's content is
                short but "almost against the browser edge" once the
                Optional accordion is expanded and the whole page scrolls
                further than that 24px can compensate for. This is a
                direct, targeted spacing fix; it doesn't touch the
                bottom-anchoring mechanism itself.
                Round E: increased again, 32px -> 48px -- still reported
                as feeling pressed against the browser edge with every
                accordion section expanded. */}
            <Box className="urbanum-sidebar-right-actions">
              {/* Round E ("Step 2 -- Choose Type"): Archive Item/Journal
                  Entry used to render here, bottom-anchored. They now
                  render at the top of this sidebar instead (see that
                  block, above, right after this Stack's opening) so the
                  decision sits directly under CENTER's own heading.
                  Nothing else about this bottom-anchored Box changed --
                  Continue/Cancel and Publish below are unaffected. */}
              <Stack space={4}>
                {/* Round E ("Step 3 -- Continue / Cancel"): Cancel Import
                    moved here from underneath the image in CENTER (see
                    that region's own comment above) -- same handler
                    (handleStartOver), same disabled condition it had
                    there, just relocated directly beneath Continue so the
                    two read as one decision pair, always visible without
                    scrolling. Styled with the same mode="bleed" +
                    secondaryButtonStyle treatment every other secondary
                    action in this file already uses -- Continue stays the
                    only dark, primary control on this step. */}
                {step === 'required' && currentDraft && (
                  <Stack space={3}>
                    <Button
                      text={isSavingRequired ? 'Saving…' : 'Continue →'}
                      mode="default"
                      tone="default"
                      disabled={!requiredComplete || isSavingRequired || isCancellingImport}
                      style={{...primaryButtonStyle, ...solidActionStyle, width: '100%'}}
                      onClick={handleSaveRequired}
                    />
                    <Button
                      text={isCancellingImport ? 'Cancelling…' : 'Cancel Import'}
                      mode="bleed"
                      tone="default"
                      disabled={isSavingRequired || isCancellingImport}
                      style={{...secondaryButtonStyle, width: '100%'}}
                      onClick={handleCancelImport}
                    />
                  </Stack>
                )}

                {/* Round F ("Continue / Cancel" / CENTER heading strip):
                    Back used to render directly beneath the image in
                    CENTER (see that region's own comment above) -- moved
                    here, beneath Publish, for the same "one decision
                    pair, always visible without scrolling" reasoning
                    Round E already applied to Required's own Continue/
                    Cancel. Same handler/disabled condition as before,
                    just relocated and given the same width:'100%'
                    treatment as every other secondary action in this
                    Box. */}
                {step === 'optional' && currentDraft && currentDraft.type === 'archiveItem' && (
                  <Stack space={3}>
                    <Button
                      text={isSavingOptional ? 'Saving…' : isPublishing ? 'Publishing…' : 'Publish →'}
                      mode="default"
                      tone="default"
                      disabled={
                        isSavingOptional ||
                        isPublishing ||
                        !documentOperations.publish ||
                        Boolean(documentOperations.publish.disabled)
                      }
                      style={{...primaryButtonStyle, ...solidActionStyle, width: '100%'}}
                      onClick={handleSaveOptional}
                    />
                    <Button
                      text="Back"
                      mode="bleed"
                      tone="default"
                      disabled={isSavingOptional || isPublishing}
                      style={{...secondaryButtonStyle, width: '100%'}}
                      onClick={() => setStep('required')}
                    />
                  </Stack>
                )}

                {/* Same relocation as the archiveItem branch above, for
                    the Journal Entry variant -- Cancel Import (not
                    Back), same reasoning Required's own Cancel Import
                    already gave: a Journal Entry draft already exists by
                    this screen, so returning to Choose Type is a dead
                    end, not a real "back." */}
                {step === 'optional' && currentDraft && currentDraft.type !== 'archiveItem' && (
                  <Stack space={3}>
                    <Button
                      text={isSavingOptional ? 'Saving…' : isPublishing ? 'Publishing…' : 'Publish →'}
                      mode="default"
                      tone="default"
                      disabled={
                        isSavingOptional ||
                        isPublishing ||
                        isCancellingImport ||
                        !documentOperations.publish ||
                        Boolean(documentOperations.publish.disabled)
                      }
                      style={{...primaryButtonStyle, ...solidActionStyle, width: '100%'}}
                      onClick={handleSaveOptional}
                    />
                    <Button
                      text={isCancellingImport ? 'Cancelling…' : 'Cancel Import'}
                      mode="bleed"
                      tone="default"
                      disabled={isSavingOptional || isPublishing || isCancellingImport}
                      style={{...secondaryButtonStyle, width: '100%'}}
                      onClick={handleCancelImport}
                    />
                  </Stack>
                )}

                {/* Round F ("Continue Previous"): moved from the top of
                    this column (Round E's position, directly under the
                    heading) to here -- always the LAST item in this
                    bottom-anchored Stack, so it renders beneath whatever
                    active controls this step has, or alone (still
                    pinned to the bottom via the outer Box's
                    marginTop:'auto') on steps with no active controls of
                    their own. "Its purpose is to resume an older
                    import -- not compete with the current one... should
                    always be visually subordinate to the active
                    workflow." Content/behavior is byte-for-byte the same
                    as before: same hasPendingDrafts gate, same kicker/
                    count text, same native Resume Editing button
                    (inverseButtonStyle + handleContinueEditing) -- only
                    its position in the tree changed. */}
                {hasPendingDrafts && (
                  <Card
                    padding={4}
                    radius={0}
                    shadow={0}
                    tone="default"
                    style={{border: `1px solid ${HAIRLINE}`, backgroundColor: 'transparent'}}
                  >
                    <Stack space={3}>
                      <Text size={0} style={kickerStyle}>
                        Continue Previous
                      </Text>
                      <Text size={1} style={{color: INK}}>
                        {pendingDrafts.length === 1
                          ? '1 unfinished import'
                          : `${pendingDrafts.length} unfinished imports`}
                      </Text>
                      <button
                        type="button"
                        style={inverseButtonStyle}
                        onClick={handleContinueEditing}
                      >
                        Resume Editing →
                      </button>
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Box>
          </Flex>
        </Box>
        </Flex>
      </Flex>
      </Box>
    </Container>
  )
}
