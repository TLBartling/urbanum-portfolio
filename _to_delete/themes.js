import { fetchThemes } from "../cms/queries.js";

// Content layer seam (Frontend <-> CMS handshake, Phase 4): Themes now
// come from Sanity via their own dedicated query, following the exact
// async-boundary containment pattern archiveItems.js/projects.js already
// established -- see archiveItems.js's own comment for the full
// rationale, unchanged here.
//
// Before this phase, getThemes() derived the distinct set of theme names
// already present across (by then already-live) Archive Items, since
// Theme had no dedicated query of its own yet. That was safe to leave
// alone at the time because nothing in the frontend actually called
// getThemes() (confirmed: its only reference outside this file was its
// own barrel export in content/index.js) -- but it also had a real gap a
// dedicated query doesn't have: a Theme document Josh creates in Studio
// before tagging anything with it would never have appeared. This now
// queries Theme documents directly, the same way Projects does -- see
// cms/queries.js's THEMES_QUERY for why it orders alphabetically rather
// than by a sortOrder field the schema doesn't have.
//
// getThemes() keeps the exact same public shape it always had: a
// synchronous function returning a plain array of theme name strings.
let cachedThemes = [];

// Same value and reasoning as archiveItems.js/projects.js's
// LOAD_TIMEOUT_MS. All three loads now run concurrently from main.jsx
// (Promise.all), so this doesn't add to the total wait.
const LOAD_TIMEOUT_MS = 1800;

// Called exactly once, by main.jsx, alongside loadArchiveItems() and
// loadProjects(). Same contract as those: no fallback to mock/derived
// data on failure or timeout, and any failure is logged loudly via
// console.error rather than swallowed.
export async function loadThemes() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchThemes(), timeout]);

    if (result === null) {
      console.error(
        `[content/themes] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for live Themes from Sanity. Continuing with no Theme data for this session.`,
      );
      return;
    }

    cachedThemes = result;
  } catch (err) {
    console.error(
      "[content/themes] Failed to load live Themes from Sanity. Continuing with no Theme data for this session.",
      err,
    );
  }
}

export function getThemes() {
  return cachedThemes;
}
