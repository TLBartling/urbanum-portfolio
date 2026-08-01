import { PROJECTS } from "../mockProjects";

// Content layer seam (Frontend <-> CMS handshake, Phase 1): a pure
// passthrough to the existing mock Project dataset. See archiveItems.js
// for the full rationale -- the same applies here.
export function getProjects() {
  return PROJECTS;
}
