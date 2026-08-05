import { fetchJournalEntries } from "../cms/queries.js";

// Content layer seam (Frontend <-> CMS handshake, Journal milestone):
// Journal Entries now come from Sanity, following the exact
// async-boundary containment pattern archiveItems.js/projects.js/
// themes.js already established -- see archiveItems.js's own comment for
// the full rationale, unchanged here.
//
// Before this milestone, getJournalEntries() returned a hardcoded empty
// array: there was no mock "Journal Entry" dataset to fall back on, and
// JournalPage.jsx read directly from App.jsx's `allImages` instead (see
// that file's own comment on this seam). This milestone replaces both
// halves of that at once -- this file now queries real Photo Journal
// Entry documents, and JournalPage.jsx's own `entries` prop default now
// derives from what this returns instead of `allImages`.
//
// getJournalEntries() keeps the exact same public shape it always had: a
// synchronous function returning a plain array (previously always empty;
// now whatever the live load below populated it with).
let cachedJournalEntries = [];

// Same value and reasoning as archiveItems.js/projects.js/themes.js's
// LOAD_TIMEOUT_MS. All four loads now run concurrently from main.jsx
// (Promise.all), so this doesn't add to the total wait.
const LOAD_TIMEOUT_MS = 1800;

// Called exactly once, by main.jsx, alongside loadArchiveItems(),
// loadProjects(), and loadThemes(). Same contract as those: no fallback
// to mock/derived data on failure or timeout (there was never a mock
// Journal Entry dataset to fall back to in the first place), and any
// failure is logged loudly via console.error rather than swallowed. If
// the live fetch fails, the app still renders -- JournalPage.jsx's grid
// just has no entries for that session, the same "renders normally, just
// without this data" contract archiveItems.js/projects.js/themes.js
// already guarantee.
export async function loadJournalEntries() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchJournalEntries(), timeout]);

    if (result === null) {
      console.error(
        `[content/journalEntries] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for live Journal Entries from Sanity. Continuing with no Journal Entry data for this session.`,
      );
      return;
    }

    cachedJournalEntries = result;
  } catch (err) {
    console.error(
      "[content/journalEntries] Failed to load live Journal Entries from Sanity. Continuing with no Journal Entry data for this session.",
      err,
    );
  }
}

export function getJournalEntries() {
  return cachedJournalEntries;
}
