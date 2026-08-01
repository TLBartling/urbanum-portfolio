import { fetchProjects } from "../cms/queries.js";

// Content layer seam (Frontend <-> CMS handshake, Phase 3): Projects now
// come from Sanity, following the exact async-boundary containment
// pattern archiveItems.js already established for Archive Items -- see
// that file's own comment for the full rationale, which applies here
// unchanged. getProjects() stays a synchronous function returning a plain
// array; no caller's signature changed.
//
// THE ASYNC BOUNDARY: same shape as archiveItems.js -- a one-time load,
// cached in a module-level variable, performed once by main.jsx before
// the app's first render (see loadProjects() below and its call site in
// main.jsx, alongside loadArchiveItems()).
//
// One difference from Archive Items worth calling out: every existing
// caller of getArchiveItems() only ever runs at render/call time (inside
// a component function body or an event handler), so gating Router's
// first mount on the load being done was enough. Projects had one caller
// that ran at *module-evaluation* time instead -- App.jsx's
// PROJECT_TITLES/PROJECT_SLUG_BY_TITLE, computed as module-level consts,
// which would have run (and permanently cached an empty result) before
// this load could ever finish. That one call site moved inside the App()
// component itself (see App.jsx's own comment at that change) so it reads
// this cache at render time, same as every other consumer -- nothing
// about *this* file's pattern needed to change to accommodate that.
let cachedProjects = [];

// Same value and same reasoning as archiveItems.js's LOAD_TIMEOUT_MS --
// see that file's comment. Both loads now run concurrently from
// main.jsx (Promise.all), so this doesn't add to the total wait.
const LOAD_TIMEOUT_MS = 1800;

// Called exactly once, by main.jsx, alongside loadArchiveItems(). Same
// contract as that function: no fallback to mock data on failure or
// timeout (Sanity is the one source of truth for Projects now, not a
// hybrid system), and any failure is logged loudly via console.error
// rather than swallowed. If the live fetch fails, the app still renders
// -- Project-dependent UI (the Filter's Project category, Project pages)
// just has no Project data for that session.
export async function loadProjects() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchProjects(), timeout]);

    if (result === null) {
      console.error(
        `[content/projects] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for live Projects from Sanity. Continuing with no Project data for this session.`,
      );
      return;
    }

    cachedProjects = result;
  } catch (err) {
    console.error(
      "[content/projects] Failed to load live Projects from Sanity. Continuing with no Project data for this session.",
      err,
    );
  }
}

export function getProjects() {
  return cachedProjects;
}
