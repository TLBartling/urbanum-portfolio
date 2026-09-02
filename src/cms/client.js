import { createClient } from "@sanity/client";

// The one Sanity client the frontend uses. Project ID and dataset match
// the same production Sanity project the Studio (cms/, a separate
// standalone app) is already connected to -- see cms/sanity.config.js.
//
// Hardcoded rather than read from environment variables: this is the
// smallest possible vertical slice proving the CMS handshake itself.
// Moving these two values into Vite env vars is a reasonable follow-up
// before deployment, but isn't required to prove the connection works,
// so it's deliberately left out of this milestone's scope.
//
// Surgical Hidden-in-Archive Debug: confirmed root cause of a Sanity
// Archive Item marked displayRole: "Hidden" in Studio still visibly
// appearing in the main Archive. The full chain was traced end-to-end
// and every link is correct: ARCHIVE_ITEMS_QUERY projects `displayRole`
// verbatim (cms/queries.js), normalizeArchiveItem preserves it under that
// exact name, content/archiveItems.js's cache stores it unmodified, and
// getArchiveItems() -- the one shared accessor every Archive consumer
// (App.jsx's gallery-batch/search/relationship paths, HoverOverlay.jsx,
// AboutPage.jsx, metadataQueryEngine.js) already reads through, with no
// other bypass or stale alternate query found anywhere in src/ -- does
// filter `item.displayRole !== "Hidden"` before any of them ever see the
// array. That filter is correct and was left untouched.
// useCdn: true (previous value) is what breaks it in practice, not the
// filter logic: every query on this client, including
// ARCHIVE_ITEMS_QUERY, was being served through Sanity's API CDN, which
// edge-caches GROQ responses. A displayRole edit made in Studio can take
// a noticeable window to propagate through that cache, so this client
// could keep handing the frontend the archive item's PRE-edit
// displayRole value (whatever it was before Josh switched it to Hidden)
// well after the edit was published -- the JS-level filter is dutifully
// correct against whatever value it receives, it just wasn't always
// receiving today's real value. useCdn: false trades the CDN's edge
// latency for always-current reads directly from Sanity's live API,
// which is the standard fix for exactly this "my Studio edit isn't
// showing up yet" class of symptom. Applied to the one shared client
// (not just for Archive Items) since every other content type -- Project,
// Theme, Journal Entry, About/Contact -- reads through this same client
// and is equally exposed to the identical staleness risk; scoping the
// fix to a second, Archive-only client instance would be more invasive
// than this one-line change, not less.
export const client = createClient({
  projectId: "zxmuvik1",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});
