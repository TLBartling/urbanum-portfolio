// Standalone verification utility for the CMS -> Sanity -> Frontend Contract
// handshake. This script is NOT wired into the app, the content abstraction
// layer, or any component -- it exists purely so a human can run one command
// locally and visually confirm that a real Archive Item created in the
// Sanity Studio comes back through fetchArchiveItems() shaped exactly like
// the frontend already expects (see mockArchiveItems.js's own header
// comment: "shaped exactly like the Frontend <-> CMS Content Contract").
//
// Run with:  npm run verify:cms
// (or directly:  node scripts/verify-live-handshake.mjs)
//
// Requires @sanity/client and @sanity/image-url to be installed
// (npm install) and at least one Archive Item to exist in the 'production'
// dataset.

import { client } from "../src/cms/client.js";
import { urlFor } from "../src/cms/imageUrl.js";
import {
  ARCHIVE_ITEMS_QUERY,
  fetchArchiveItems,
} from "../src/cms/queries.js";

// ---------------------------------------------------------------------------
// Frontend contract checklist -- every field a normalized Archive Item is
// expected to carry per the locked CMS schema and the existing frontend
// contract. `optional: true` fields are allowed to be empty/undefined
// without failing verification; everything else must be present.
// ---------------------------------------------------------------------------
const CONTRACT_FIELDS = [
  { key: "image", optional: false },
  { key: "archiveNumber", optional: false },
  { key: "project", optional: false },
  { key: "themes", optional: false },
  { key: "theme", optional: false }, // primary theme, i.e. themes[0]
  { key: "tags", optional: false },
  { key: "displayRole", optional: false },
  { key: "sortOrder", optional: false },
  { key: "title", optional: true },
  { key: "location", optional: true },
  { key: "caption", optional: true },
  { key: "date", optional: true }, // derived from year / fullDate
];

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function checkField(item, field) {
  const value = item[field.key];
  if (isPresent(value)) return { pass: true, label: "PASS", detail: JSON.stringify(value) };
  if (field.optional) return { pass: true, label: "OK (empty, optional)", detail: String(value) };
  return { pass: false, label: "FAIL (required, missing)", detail: String(value) };
}

// ---------------------------------------------------------------------------
// Image URL check. Two independent levels are reported: (1) does it parse
// as a URL pointing at Sanity's CDN, and (2) is it reachable right now via
// a real HTTP HEAD request. A failure at either level is unambiguous about
// which one broke.
// ---------------------------------------------------------------------------
async function checkImageUrl(url) {
  if (!url) return { shape: "FAIL (no URL produced)", reachable: "SKIPPED" };

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { shape: "FAIL (not a valid URL)", reachable: "SKIPPED" };
  }

  const shape = parsed.hostname.endsWith("sanity.io")
    ? `PASS (sanity.io CDN host: ${parsed.hostname})`
    : `WARN (unexpected host: ${parsed.hostname})`;

  let reachable;
  try {
    const res = await fetch(url, { method: "HEAD" });
    reachable = res.ok ? `PASS (HTTP ${res.status})` : `FAIL (HTTP ${res.status})`;
  } catch (err) {
    reachable = `FAIL (${err.message})`;
  }

  return { shape, reachable };
}

// ---------------------------------------------------------------------------
// privateNotes verification. This field is deliberately EXCLUDED from
// ARCHIVE_ITEMS_QUERY / fetchArchiveItems() -- that exclusion is what
// guarantees it can never leak into the public site. To verify the field
// still exists on the underlying Sanity document (per this milestone's
// checklist) without weakening that guarantee, this script runs a second,
// separate, verification-only GROQ query. Its result is printed clearly
// labeled and is NEVER merged into the shared production query or the
// normalized object fetchArchiveItems() returns to the app.
//
// Also excludes drafts, matching ARCHIVE_ITEMS_QUERY -- otherwise an
// unpublished document could sit in this map under the same archiveNumber
// as a published one, or contribute a privateNotes value that doesn't
// correspond to anything fetchArchiveItems() actually returned this run.
// ---------------------------------------------------------------------------
const PRIVATE_NOTES_VERIFICATION_ONLY_QUERY = `
  *[_type == "archiveItem" && !(_id in path("drafts.**"))] { archiveNumber, privateNotes }
`;

async function fetchPrivateNotesByArchiveNumber() {
  const rows = await client.fetch(PRIVATE_NOTES_VERIFICATION_ONLY_QUERY);
  return new Map(rows.map((row) => [row.archiveNumber, row.privateNotes]));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log("Fetching live Archive Items via fetchArchiveItems()...\n");

const items = await fetchArchiveItems();

if (items.length === 0) {
  console.log(
    "No Archive Items found in the 'production' dataset.\n" +
      "Create at least one Archive Item in the Studio, then re-run this script.",
  );
  process.exit(1);
}

console.log(`Retrieved ${items.length} Archive Item(s).\n`);

// Raw items, fetched through the exact same shared query fetchArchiveItems()
// uses -- pulled separately here only so this script can print year/fullDate
// side by side with the derived `date` field below. This is not a second,
// different query; it's the same ARCHIVE_ITEMS_QUERY, reused for display.
const rawItems = await client.fetch(ARCHIVE_ITEMS_QUERY);
const rawByArchiveNumber = new Map(rawItems.map((raw) => [raw.archiveNumber, raw]));

const privateNotesByArchiveNumber = await fetchPrivateNotesByArchiveNumber();

let failCount = 0;

for (const item of items) {
  console.log("=".repeat(72));
  console.log(`Archive Item ${item.archiveNumber}  —  ${item.title ?? "(untitled)"}`);
  console.log("=".repeat(72));

  console.log("\n-- Normalized object (exactly what fetchArchiveItems() returns) --");
  console.log(JSON.stringify(item, null, 2));

  console.log("\n-- Frontend contract field checklist --");
  for (const field of CONTRACT_FIELDS) {
    const { pass, label, detail } = checkField(item, field);
    if (!pass) failCount++;
    console.log(`  [${label}] ${field.key}: ${detail}`);
  }

  console.log("\n-- Reference resolution --");
  if (item.project) {
    console.log(`  Project:      PASS (resolved to slug "${item.project}")`);
  } else {
    console.log(`  Project:      FAIL (null -- reference did not resolve, or no Project is assigned)`);
    failCount++;
  }
  if (item.themes.length > 0) {
    console.log(`  Themes:       PASS (resolved to ${item.themes.length} title(s): ${item.themes.join(", ")})`);
  } else {
    console.log(`  Themes:       FAIL (empty -- reference(s) did not resolve, or no Theme is assigned)`);
    failCount++;
  }
  console.log(`  Primary theme: ${item.theme ? `PASS ("${item.theme}")` : "FAIL (null)"}`);
  if (!item.theme) failCount++;

  console.log("\n-- Image URL (built via imageUrl.js's urlFor()) --");
  const imageCheck = await checkImageUrl(item.image);
  console.log(`  URL:         ${item.image}`);
  console.log(`  Shape:       ${imageCheck.shape}`);
  console.log(`  Reachable:   ${imageCheck.reachable}`);
  if (imageCheck.shape.startsWith("FAIL") || imageCheck.reachable.startsWith("FAIL")) failCount++;

  console.log("\n-- year / fullDate -> date collapsing (expected, not a bug) --");
  const raw = rawByArchiveNumber.get(item.archiveNumber);
  console.log(`  raw.year:     ${JSON.stringify(raw?.year)}`);
  console.log(`  raw.fullDate: ${JSON.stringify(raw?.fullDate)}`);
  console.log(`  derived date: ${JSON.stringify(item.date)}`);

  console.log("\n-- privateNotes (verification-only; NOT part of fetchArchiveItems()'s output) --");
  const privateNotes = privateNotesByArchiveNumber.get(item.archiveNumber);
  const hasNotes = privateNotes !== undefined && privateNotes !== null && privateNotes !== "";
  console.log(`  On the raw Sanity document: ${hasNotes ? `PASS (present: ${JSON.stringify(privateNotes)})` : "OK (not set -- field is optional)"}`);
  console.log(`  On the normalized object:   ${"privateNotes" in item ? "FAIL (leaked into normalized object!)" : "PASS (correctly absent)"}`);
  if ("privateNotes" in item) failCount++;

  console.log("");
}

console.log("=".repeat(72));
console.log(
  failCount === 0
    ? "Verification complete: no failures detected."
    : `Verification complete: ${failCount} check(s) failed -- see FAIL lines above.`,
);
console.log("=".repeat(72));

process.exit(failCount === 0 ? 0 : 1);
