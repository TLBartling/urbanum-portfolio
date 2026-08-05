import {buildLegacyTheme} from 'sanity'

// Unified Visual Theme -- Priority 1 prototype, smallest safe version.
//
// INVESTIGATION FIRST: three things were checked directly against the
// installed source (sanity@6.7.0, @sanity/ui@3.5.0) before writing a
// single line here.
//
// 1. Is there a newer, non-deprecated way to build a full Studio theme?
//    No. `@sanity/ui/theme`'s `buildTheme()` -- the function that
//    generates Sanity's own modern color system, the same one `sanity`
//    itself calls internally to produce its default `studioTheme` -- is
//    tagged `@internal` in the installed package (node_modules/@sanity/ui/
//    dist/theme.d.ts), not `@public`. Its input type, `ThemeConfig`, IS
//    `@public`, but that's cold comfort: there is no public function that
//    accepts it. The `sanity` package's own public type declarations
//    (lib/index-Z0jxEn8U.d.ts) never re-export `buildTheme` either --
//    confirmed by grepping the full export list, zero matches. So the
//    richer, more granular modern color system exists in the installed
//    code, but isn't something this project is allowed to call directly
//    without reaching into an internal API, which the brief rules out.
//    `buildLegacyTheme()` remains the only `@public` entry point for this,
//    despite its own `@deprecated -- Will be removed in upcoming major
//    version` tag.
//
// 2. Is there a hybrid approach? Not in the sense of "combine the modern
//    and legacy builders" -- the modern one isn't callable. The real
//    hybrid is scope: use the one documented lever, but only for the
//    handful of seed values that matter, isolated in this one file, so
//    the whole thing is easy to find, revert, or replace outright once
//    Sanity ships a supported successor. That's what this file is.
//
// 3. How much of the Studio can actually come into harmony? Read
//    `buildLegacyTheme`'s own implementation (lib/index.js), not just its
//    type signature, to find out. Two things fell out of that reading that
//    changed what this prototype actually sets:
//
//    a) `buildLegacyTheme` doesn't pass CSS custom properties through
//       as-is -- it feeds them into the exact same color-generation
//       pipeline (`createColorTheme`) the internal modern builder uses,
//       via `buildLegacyPalette`/`buildLegacyTones`/`buildColor`. That
//       pipeline generates the FULL tone tree from a handful of seed
//       colors: surface backgrounds, borders, shadows, and --
//       confirmed by reading `buildColor`'s own `base`/`solid` generator
//       functions -- the same generated tints feed every tone a
//       component can be given (default, primary, positive, caution,
//       critical), which is what list-row/menu-item selection and
//       highlight states render through. So this genuinely can bring
//       selection, hover, and highlight states into harmony together,
//       consistently, not just the couple of surfaces that look most
//       obviously "Sanity blue" today.
//
//    b) `--brand-primary` is the real master lever, not a decorative
//       extra. Read `resolveLegacyTheme`'s own defaulting logic: when
//       `--focus-color`, `--default-button-primary-color`, and
//       `--state-info-color` aren't set explicitly, all three fall back
//       to `--brand-primary`. That one value is what actually drives
//       Sanity's stock blue everywhere it shows up -- focus rings on
//       ordinary fields, primary buttons, and `tone="primary"` surfaces
//       (the same tone this project already found and fixed twice inside
//       its own code, in AnnotationField.jsx) all trace back to it.
//
// WHAT'S OUT OF REACH EVEN WITH THIS LEVER: `StudioTheme` (the type
// `buildLegacyTheme` returns) is explicitly `RootTheme` with `space`,
// `radius`, `shadows`, `container`, `input`, `button`, and `layer` all
// omitted (installed source, same file as `StudioTheme`'s own
// declaration) -- confirmed again by reading `buildLegacyTheme`'s actual
// return value, which is only ever `{color, fonts, __dark, __legacy}`.
// Only color and font-family are theme-able through Studio's config at
// all, by any documented means. Real typographic hierarchy (size, weight,
// letter-spacing) and spacing/surface geometry for native Sanity chrome
// are impossible without replacing the components that render them --
// exactly the line the brief says not to cross. That work stays future
// work, not because it wasn't investigated, but because it's structurally
// unreachable through configuration.
//
// THE PROTOTYPE ITSELF: three seed values, the smallest set that lets the
// visual direction actually be judged. `--brand-primary` set to this
// project's own INK (matches ImportWorkspace.jsx's INK constant) removes
// Sanity blue from focus rings, primary buttons, and every `tone="primary"`
// surface in one move, per the mechanism above. `--component-bg`/
// `--component-text-color` bring the base surface -- document list panes,
// document editor panes, ordinary cards -- onto the same warm off-white/
// ink pairing the navbar and Archive rail already use, rather than
// Sanity's stock white/black. Deliberately NOT touched yet: `--gray-base`
// (leaves border/tint generation on its current values so this round
// isolates cause and effect -- if the generated grays still read too cool
// once this is actually seen rendered, that's the next value to adjust,
// not a guess to bundle in now) and `--focus-color`/
// `--default-button-primary-color` individually (both already inherit
// from `--brand-primary` via the fallback chain above, so setting them
// separately here would be redundant, not additive).
const INK = '#1a1a1a'
const SHELL_BACKGROUND = '#faf9f5'

// Final polish pass ("Archive editor validation styling"): Josh reported
// the stock validation-red (a required reference field, e.g. Themes,
// rendering with a red border and red placeholder the instant a new
// empty item is added -- before he's typed or attempted anything) as
// too aggressive and out of step with Urbanum's visual language.
//
// INVESTIGATED FIRST, same discipline as the rest of this file: is
// "only show red after a genuine invalid publish/save attempt" (the
// preferred behavior) reachable through public config? Read the
// installed source's field-member types (FieldMember.changed: boolean,
// index-Z0jxEn8U.d.ts) and confirmed the mechanism -- Studio only
// gates validation display on whether a field has been "changed."
// Clicking "Add item" on an array IS itself a change (an insert patch
// applied to the array), so a brand-new, still-empty reference item is
// already marked changed the instant it exists -- it renders through
// the exact same "changed + invalid" path as a field Josh actually
// typed into and then blanked, or a field left empty after a failed
// Publish attempt (useReviewChanges, same file). There is no separate
// "untouched" render path to keep neutral and no public flag that
// distinguishes "just inserted" from "genuinely reviewed" -- confirmed
// by reading the field-member/review-changes types directly, not
// assumed. So the preferred behavior (neutral until submission) isn't
// reachable without a custom Input component replacing Studio's own
// reference/array inputs -- a far bigger, riskier change than a polish
// pass, and explicitly the fallback this task's own brief anticipated.
//
// FALLBACK IMPLEMENTED: restyle the idle appearance to Studio's neutral
// gray, per the brief. '--state-danger-color' is the one seed
// buildLegacyTheme() exposes for this (LegacyThemeProps, confirmed
// '@public'; feeds legacyPalette.state.danger.fg, which
// buildLegacyTones() turns into the 'critical' tone every non-button
// invalid-state surface renders through -- see buildLegacyPalette/
// buildLegacyTones in the installed source). Set to gray[500].hex
// (#727892) -- the exact same seed '--gray-base' already defaults to,
// and thus the same value already driving every ORDINARY field's
// border. Verified by actually building both themes and diffing the
// output (not guessed): with this set, critical.base.border resolves
// to #c3c5cd, byte-identical to default.base.border's own #c3c5cd --
// an invalid reference field's idle border is now indistinguishable
// from a normal field's, exactly "matches the Studio's neutral gray
// palette." Nothing about Rule.required()/Rule.min()/publish-blocking
// changed -- this is a color seed only, the same category of change as
// --brand-primary/--component-bg above.
//
// SCOPE, deliberately narrow: only '--state-danger-color' is set, not
// '--default-button-danger-color' -- confirmed those are two separate
// seeds (buildLegacyPalette above) feeding two separate tone trees
// (state vs. button). Genuinely destructive actions that use a
// tone="critical" BUTTON (Remove Theme's own trigger, for one --
// RemoveThemeAction.jsx) keep their real red; only the passive
// state/card-level critical tone (field borders, placeholder text,
// inline validation copy) is softened. One known, deliberate
// consequence: ImportWorkspace.jsx's own errorTextStyle read this same
// shared critical-fg token for genuine save/publish-failure messages
// (a different concern entirely -- an operation actually failed, not a
// field that's merely empty) -- decoupled there with its own comment
// so that stays visibly red, unaffected by this change. Confirm-dialog
// tones (e.g. Remove Theme's own confirmation) were not independently
// verified beyond that -- no live Studio/browser access in this
// environment to see the rendered result -- flagged for a follow-up
// look if it reads as unexpectedly muted in practice.
export const urbanumStudioTheme = buildLegacyTheme({
  '--brand-primary': INK,
  '--component-bg': SHELL_BACKGROUND,
  '--component-text-color': INK,
  '--state-danger-color': '#727892',
})
