import { fetchContactPage } from "../cms/queries.js";

// Content layer seam (Contact drawer -> Contact page milestone): the
// single place the rest of the app asks for the Contact Page singleton's
// content. Mirrors src/content/aboutPage.js exactly, field for field and
// function for function -- see that file's own comment for the full
// async-boundary rationale, which applies unchanged here. getContactPage()
// stays a synchronous function returning a plain value (an object, or
// null if the document doesn't exist yet), exactly the same shape every
// other content-layer reader in this project already has.
let cachedContactPage = null;

// Same value and reasoning as every other content file's own
// LOAD_TIMEOUT_MS (see archiveItems.js/aboutPage.js) -- this joins the
// same Promise.all in main.jsx, so it doesn't add to the total wait.
const LOAD_TIMEOUT_MS = 1800;

// Called exactly once, by main.jsx, alongside the other loads. Same
// contract as loadAboutPage(): no fallback/mock data, any failure is
// logged loudly via console.error rather than swallowed. If the live
// fetch fails or the document hasn't been created yet, getContactPage()
// simply returns null -- src/ContactPage.jsx's own presence guards
// decide what that looks like on the page.
export async function loadContactPage() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchContactPage(), timeout]);

    if (result === null) {
      console.error(
        `[content/contactPage] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for the live Contact Page document from Sanity. Continuing with no Contact Page content for this session.`,
      );
      return;
    }

    cachedContactPage = result;
  } catch (err) {
    console.error(
      "[content/contactPage] Failed to load the live Contact Page document from Sanity. Continuing with no Contact Page content for this session.",
      err,
    );
  }
}

export function getContactPage() {
  return cachedContactPage;
}
