import { fetchArchiveItems } from "../cms/queries.js";

// Content layer seam (Frontend <-> CMS handshake, Repository milestone):
// the single place the rest of the app asks for Archive Item data. This
// is the one function whose *source* actually changes in this milestone
// -- Projects, Themes, and Journal Entries all stay on their existing
// mock source (see projects.js, themes.js, journalEntries.js). Archive
// Items now come from Sanity; nothing outside this file needs to know
// that, and no caller's signature changed: getArchiveItems() is still a
// synchronous function returning a plain array, exactly as it always
// has been.
//
// THE ASYNC BOUNDARY: fetchArchiveItems() is async (it's a real network
// call), but every existing caller -- the archive procedural composition
// system's gallery-batch construction in App.jsx, HoverOverlay.jsx,
// projectContent.js -- calls getArchiveItems() synchronously, inline,
// with no loading-state handling, and none of that was to be touched by
// this milestone. Rather than push async through all of that (explicitly
// out of scope), the async boundary is contained entirely to this
// module: a one-time load, cached in a module-level variable, performed
// once by main.jsx before the app's first render (see loadArchiveItems()
// below and its call site in main.jsx). By the time any component ever
// calls getArchiveItems(), the cache is already populated -- the function
// itself never has to be async.
let cachedArchiveItems = [];

// Bounds how long main.jsx waits before mounting the router/app tree (see
// main.jsx). Not a bound on the app's first paint anymore -- SplashScreen
// mounts immediately regardless, per the startup-experience fix -- but on
// how long Router (and everything it renders, which is everything that
// reads Archive Items) stays deferred. If it's ever hit, Router mounts
// anyway -- see the empty-array fallback below -- just without Archive
// Item data for that session.
//
// Deliberately shorter than a generous network ceiling would otherwise be
// (5s in an earlier version of this file): SplashScreen has its own
// independent 2-second timeout waiting to find the real header logo in
// the DOM (see SplashScreen.jsx's HEADER_LOGO_WAIT_TIMEOUT), which can't
// exist until Router mounts. Keeping this comfortably under that value
// means Router mounts, and the header logo appears, before SplashScreen's
// own timeout gives up -- so the normal splash animation still plays even
// in the timeout case, rather than SplashScreen aborting early into a
// still-not-mounted Router.
const LOAD_TIMEOUT_MS = 1800;

// Called exactly once, by main.jsx, in the background while SplashScreen
// is already animating (see main.jsx). Not part of the per-request
// repository API that components use (that's still just
// getArchiveItems() / findArchiveItemBySrc(), unchanged) -- this is a
// one-time bootstrap hook, the smallest possible surface for the load to
// happen through.
//
// Deliberately does NOT fall back to mock data on failure or timeout.
// That was a considered choice, not an oversight: this milestone's whole
// point is that Sanity is now the one source of truth for Archive Items,
// not a second, hybrid system kept warm as a silent fallback (the same
// reasoning that ruled out a mock/live merge earlier in this project). If
// the live fetch fails, the app still renders normally -- the archive
// procedural composition system's images come from the static image pool
// regardless, per its own existing design -- it just does so with no
// Archive Item metadata for that session, and the failure is logged
// loudly via console.error rather than silently swallowed.
export async function loadArchiveItems() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchArchiveItems(), timeout]);

    if (result === null) {
      console.error(
        `[content/archiveItems] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for live Archive Items from Sanity. Continuing with no Archive Item data for this session.`,
      );
      return;
    }

    cachedArchiveItems = result;
  } catch (err) {
    console.error(
      "[content/archiveItems] Failed to load live Archive Items from Sanity. Continuing with no Archive Item data for this session.",
      err,
    );
  }
}

export function getArchiveItems() {
  return cachedArchiveItems;
}

// findArchiveItemBySrc is a derived lookup over Archive Item data, not a
// separate content type, so it lives here rather than as its own file.
// It deliberately calls getArchiveItems() rather than reading
// cachedArchiveItems directly, so it automatically searches whatever
// getArchiveItems() currently returns with no separate edit required.
export function findArchiveItemBySrc(src) {
  return getArchiveItems().find((item) => item.image === src) ?? null;
}
