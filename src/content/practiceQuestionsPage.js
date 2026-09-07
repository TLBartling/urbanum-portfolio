import { fetchPracticeQuestionsPage } from "../cms/queries.js";

// Content layer seam (Surgical CMS pass) -- mirrors src/content/contactPage.js
// exactly, field for field and function for function; see that file's own
// comment for the full async-boundary rationale, unchanged here.
let cachedPracticeQuestionsPage = null;

const LOAD_TIMEOUT_MS = 1800;

export async function loadPracticeQuestionsPage() {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([fetchPracticeQuestionsPage(), timeout]);

    if (result === null) {
      console.error(
        `[content/practiceQuestionsPage] Timed out after ${LOAD_TIMEOUT_MS}ms waiting for the live Practice Questions Page document from Sanity. Continuing with no Practice Questions Page content for this session.`,
      );
      return;
    }

    cachedPracticeQuestionsPage = result;
  } catch (err) {
    console.error(
      "[content/practiceQuestionsPage] Failed to load the live Practice Questions Page document from Sanity. Continuing with no Practice Questions Page content for this session.",
      err,
    );
  }
}

export function getPracticeQuestionsPage() {
  return cachedPracticeQuestionsPage;
}
