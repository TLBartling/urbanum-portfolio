import { getArchiveItems } from "./archiveItems";

// Content layer seam (Frontend <-> CMS handshake, Phase 1).
//
// Unlike Archive Items and Projects, there is no dedicated mock "Theme"
// dataset in this codebase today -- Themes only ever appear inline on
// Archive Items, via the plural `themes` array (and the older singular
// `theme`, kept for the one existing reader that still expects it -- see
// HoverOverlay.jsx). getThemes() derives the distinct set of theme names
// already present across the mock Archive Items: the closest existing
// equivalent to "existing mock data" for this content type, and a shape
// (a plain array of names) that a real Sanity Theme title query can
// produce just as easily later.
//
// Nothing in the frontend currently calls getThemes() -- Header.jsx's
// Theme filter still uses its own local MOCK_THEMES placeholder, which is
// intentionally left untouched in this phase (see this phase's report:
// it is not an import of mock *data*, and wiring it up is later work).
// So this function carries no behavior-change risk today; it exists so a
// later phase has a stable name whose implementation body gets swapped.
export function getThemes() {
  const names = new Set();

  for (const item of getArchiveItems()) {
    for (const theme of item.themes ?? []) {
      names.add(theme);
    }
    if (item.theme) {
      names.add(item.theme);
    }
  }

  return Array.from(names);
}
