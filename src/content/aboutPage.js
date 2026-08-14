import { fetchAboutPage } from "../cms/queries.js";

// Content layer seam (About Page CMS milestone): the single place the
// rest of the app asks for the About Page singleton's content. Mirrors
// archiveItems.js/projects.js/themes.js/journalEntries.js exactly -- see
// archiveItems.js's own comment for the full async-boundary rationale,
// which applies unchanged here. getAboutPage() stays a synchronous
// function returning a plain value (an object, or null if the document
// doesn't exist yet), exactly the same shape every other content-layer
// reader in this project already has.
let cachedAboutPage = null;

// Same value and reasoning as every other content file's own
// LOAD_TIMEOUT_MS (see archiveItems.js) -- this joins the same
// Promise.all in main.jsx, so it doesn't add to the total wait.
const LOAD_TIMEOUT_MS = 1800;

// Called exactly once, by main.jsx, alongside the other three loads.
// Same contract: no fallback/mock data (there's nothing to fall back
// to for a singleton that simply may not exist yet), and any failure is
// logged loudly via console.error rather than swallowed. If the live
// fetch fails or the document hasn't been created yet, getAboutPage()
// simply returns null -- src/AboutPage.jsx's own presence guards decide
// what that looks like on the page, the same pattern already established
// for optional fields elsewhere in this project (see
// ProjectInfoPanel.jsx).
export async function loadAboutPage() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchAboutPage(), timeout]);

    if (result === null) {
      console.error(
        `[content/aboutPage] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for the live About Page document from Sanity. Continuing with no About Page content for this session.`,
      );
      return;
    }

    cachedAboutPage = result;
  } catch (err) {
    console.error(
      "[content/aboutPage] Failed to load the live About Page document from Sanity. Continuing with no About Page content for this session.",
      err,
    );
  }
}

export function getAboutPage() {
  return cachedAboutPage;
}
