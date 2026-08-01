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
// useCdn: true -- fast, edge-cached reads are the right tradeoff for a
// public portfolio site's read-side. Revisit only if a later Studio
// preview/uploader flow needs always-fresh (uncached) reads.
export const client = createClient({
  projectId: "zxmuvik1",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});
