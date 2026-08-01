// Content layer seam (Frontend <-> CMS handshake, Phase 1).
//
// There is no mock "Journal Entry" dataset anywhere in this codebase
// today. JournalPage.jsx currently renders raw image URLs (`allImages`,
// imported from App.jsx), not structured entries -- and the Journal Entry
// document type is intentionally independent from the Archive Item
// system in the locked CMS schema, so it was never modeled as part of
// the existing mock data in the first place.
//
// Returning an empty array here is the honest reflection of that: there
// is no "existing mock data" for this function to pass through yet.
// Inventing plausible-looking mock entries would misrepresent what
// currently exists. Because of this, JournalPage.jsx is deliberately NOT
// refactored to call this function in this phase -- doing so today would
// either require fabricating data or would visibly change the page from
// a populated grid to an empty one, both of which this phase's
// "behavior must remain 100% identical" constraint rules out. See this
// phase's report for the full explanation.
export function getJournalEntries() {
  return [];
}
