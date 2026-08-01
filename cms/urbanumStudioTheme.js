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

export const urbanumStudioTheme = buildLegacyTheme({
  '--brand-primary': INK,
  '--component-bg': SHELL_BACKGROUND,
  '--component-text-color': INK,
})
