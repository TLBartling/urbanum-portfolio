import { fetchSiteInformationPage } from "../cms/queries.js";

// Content layer seam (Surgical CMS pass) -- mirrors src/content/contactPage.js
// exactly, field for field and function for function; see that file's own
// comment for the full async-boundary rationale, unchanged here.
let cachedSiteInformationPage = null;

const LOAD_TIMEOUT_MS = 1800;

export async function loadSiteInformationPage() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchSiteInformationPage(), timeout]);

    if (result === null) {
      console.error(
        `[content/siteInformationPage] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for the live Site Information Page document from Sanity. Continuing with no Site Information Page content for this session.`,
      );
      return;
    }

    cachedSiteInformationPage = result;
  } catch (err) {
    console.error(
      "[content/siteInformationPage] Failed to load the live Site Information Page document from Sanity. Continuing with no Site Information Page content for this session.",
      err,
    );
  }
}

export function getSiteInformationPage() {
  return cachedSiteInformationPage;
}
