import {useEffect, useState} from 'react'

// Mobile Studio responsive-switching fix: plain `@media (max-width: ...)`
// CSS -- used throughout UrbanumArchiveLayout/UrbanumNavbar/UrbanumToolMenu/
// ImportWorkspace's own mobile rules -- was verified correct at the source
// level (valid syntax, balanced braces, correct classNames, no inline-style
// or `!important` conflicts, no device/UA/touch gating anywhere) but
// confirmed NOT reliably activating in the real, freshly-deployed hosted
// Studio (tested on an actual iPhone against a fresh `sanity deploy`, and
// by resizing a desktop browser against that same fresh deployment). The
// most likely explanation is a cascade/specificity conflict against
// @sanity/ui's own styled-components base rules for the exact components
// these mobile rules target (Box/Card both set their own `display` via an
// internal styled class) -- our plain single-class selectors, scoped
// inside a conditional `@media` block, can tie or lose that fight even
// when the media query itself matches correctly, silently defeating a
// `display: none` override with no console error or visible sign of why.
//
// Rather than keep debugging a cascade fight against a library's internal
// styles from the outside, this switches the responsive DECISION itself
// (mobile vs. desktop) to real JS state, sourced from the one thing that
// was never in doubt -- `window.matchMedia` reading the actual viewport
// width. Components then use that boolean to conditionally RENDER (not
// just class-toggle) the mobile-only/desktop-only pieces, and to set
// layout-critical inline styles directly -- both of which always take
// effect regardless of any styled-components specificity fight, since an
// element that was never rendered can't lose a cascade conflict, and an
// inline style always wins one.
//
// Width-only, exactly as required: reads only the viewport width via
// matchMedia, nothing about touch capability, pointer type, or user
// agent, so narrowing an ordinary desktop browser activates this exactly
// the same way an actual phone does.
export const MOBILE_STUDIO_BREAKPOINT = 768

function readMatches(query) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

// Generic width-query hook -- UrbanumNavbar's own account-name treatment
// uses a deliberately narrower 480px step than the shared 768px Studio
// breakpoint below, so this isn't hardcoded to one query.
export function useMatchesViewportQuery(query) {
  const [matches, setMatches] = useState(() => readMatches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mql = window.matchMedia(query)
    const handleChange = (event) => setMatches(event.matches)

    // Covers the case where the query itself changed (or this is the
    // first run) between the lazy useState initializer above and this
    // effect actually subscribing.
    setMatches(mql.matches)

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange)
      return () => mql.removeEventListener('change', handleChange)
    }

    // Safari < 14 fallback -- addListener/removeListener is the
    // deprecated predecessor to addEventListener/removeEventListener on
    // MediaQueryList; harmless to keep as a fallback since it's a no-op
    // branch on every browser this project otherwise targets.
    mql.addListener(handleChange)
    return () => mql.removeListener(handleChange)
  }, [query])

  return matches
}

// The one shared "am I in the mobile Studio composition" signal --
// Archive rail, Navbar, ToolMenu, and Import Workspace all read this same
// boolean rather than each re-deriving their own breakpoint.
export function useIsMobileStudio() {
  return useMatchesViewportQuery(`(max-width: ${MOBILE_STUDIO_BREAKPOINT}px)`)
}
