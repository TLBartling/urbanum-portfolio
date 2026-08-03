# Urbanum — Developer Handoff Notes (v1, draft)

Audience: a developer (Lizzy) who already knows the pre-CMS codebase — the procedural gallery, the Project/About/Journal pages, Header's Search/Filter/Menu system, and the mock-data content model. This doc covers what's new since then: the Sanity Studio (CMS) and the frontend↔Sanity handshake. It's a first pass, not polished — flag anything unclear or missing and we'll tighten it up.

Not covered here: anything about the procedural gallery's own animation/layout math (COLUMN_PATTERNS, camera/zoom, entrance animations), or the pre-existing Import Workspace tool's internals — those are unchanged from what you already know, except where called out below.

---

## 1. Overall architecture

Two separate apps in one repo, each with its own `package.json`/`node_modules`/deploy target:

- **Frontend** (`/`, root) — Vite + React 18.3.1. The public site: procedural gallery homepage, Project pages, About page, Journal page (not yet CMS-wired), Header (search/filter/menu). Deployed to Vercel as a static SPA (`vercel.json` has a catch-all rewrite to `index.html`, plus long-cache headers for `/img/optimized/*` and the logo).
- **Studio** (`cms/`) — Sanity Studio v6.7.0 (satisfies `sanity@^6.6.0`), React 19.2.4. The CMS Josh uses to author content. Deployed via `sanity deploy` (hosted by Sanity, separate from the frontend's Vercel deploy).

Both point at the same Sanity project: `projectId: "zxmuvik1"`, `dataset: "production"`. There is only one dataset — no separate dev/staging dataset exists today (see Known Limitations).

**Data flow, end to end:**

```
Josh authors content in Studio (cms/)
        │
        ▼
Sanity content lake (project zxmuvik1, dataset "production")
        │  read-only, public dataset, no auth token
        ▼
@sanity/client (src/cms/client.js) — the frontend's one Sanity client
        │
        ▼
GROQ queries (src/cms/queries.js) — one query + normalize + fetch per content type
        │
        ▼
Content layer cache (src/content/*.js) — module-level cache, populated once
        │  gate: main.jsx awaits every load*() before mounting <Router/>
        ▼
Components read via synchronous getX() calls (App.jsx, ProjectTemplate.jsx, etc.)
```

Studio document types: `archiveItem`, `project`, `theme`, `journalEntry` (schema exists, frontend not wired — see §10).

---

## 2. What changed from the original implementation

Three separate pieces of work, in order:

1. **Branded authentication ("Option A").** Replaced Sanity's default login/account UI with a Google-only OAuth flow (no provider chooser) and a branded account menu in the existing navbar. Required one narrow, deliberately isolated exception to "public APIs only" for sign-out (see §4/§7).
2. **Delete-action discoverability (investigation only, no code shipped).** Investigated exposing Delete as a standalone button next to Publish. Finding: the document footer can only ever render one standalone action button (everything else collapses into the "..." menu) — this is hard-coded in Sanity's compiled footer logic, not configurable. The Delete action's own logic and confirmation dialog *are* reusable via already-established public APIs, but there's no public seam to mount a second button next to Publish inside the native footer. Left as-is; no workaround implemented.
3. **Frontend ↔ Sanity handshake.** The bulk of this doc. Replaced the static/mock content layer with live Sanity data for Archive Items (already done before this phase of work started), Projects, Themes, and — after a debugging pass — the homepage gallery's own default image pool. Journal Entries remain unwired.

---

## 3. New CMS architecture (Studio-side, `cms/`)

- **`sanity.config.js`** — the one place everything is wired together. Worth reading top to bottom; every non-obvious field has an inline comment explaining why it's safe (most Studio config fields are `@hidden @beta` in the installed types, not `@public`, but are the same category of "documented, stable in practice" surface already used throughout — see that file's comments for the reasoning per field).
- **`auth`** — `providers` filtered to Google only (`prev.filter(p => p.name === 'google')`), `redirectOnSingle: true` so a signed-out visit skips Sanity's provider-chooser screen entirely and bounces straight to Google.
- **`studio.components`** — `navbar` → `UrbanumNavbar.jsx` (branded logo/avatar/account menu, replaces Sanity's default chrome), `toolMenu` → `UrbanumToolMenu.jsx` (groups tools into IMPORT / ARCHIVE / SETTINGS), `activeToolLayout` → `UrbanumArchiveLayout.jsx` (adds the persistent `UrbanumArchiveNav.jsx` rail beside the four Archive Structure Tools, without touching the navbar or wrapping Import/Settings).
- **`document.actions`** → `resolveDocumentActions.js` — curates Sanity's 6 built-in document actions down to just Publish (wrapped, see below) and Delete, for the 4 library document types (`archiveItem`, `journalEntry`, `project`, `theme`). Also wraps Publish for Import Workspace's own drafts to auto-advance to the next pending draft after publishing.
- **`document.inspectors`** → `resolveDocumentInspectors.js` — similarly trims default inspectors (History, Incoming References) for the same 4 types.
- **`theme`** → `urbanumStudioTheme.js` — a small branding prototype via `buildLegacyTheme` (the one documented, if deprecated, lever for Studio-wide colors).
- **`i18n.bundles`** → `urbanumStructureStrings.js` — one string override (empty-state wording).
- **Structure/navigation** (`structure.js`, `archiveSections.js`) — "one Archive application, four sections" pattern: 4 separate `structureTool()` instances (Archive Items / Projects / Themes / Photo Journal), each scoped to one document type to avoid a Structure Tool pane-collapse limitation, presented as one unified rail via `UrbanumArchiveNav.jsx` rather than Sanity's own tool switcher.
- **Import Workspace** (`importWorkspaceTool.js`, `components/ImportWorkspace.jsx`, `createImportDrafts.js`, `patchImportDraft.js`, `uploadImportImage.js`, `AnnotationField.jsx`) — Josh's bulk-photo-import tool. Pre-dates this phase of work and wasn't touched here beyond `resolveDocumentActions.js`'s publish-wrapping for its drafts. Read these directly if you need the details — not deep-dived in this handoff.
- **`advancedTool.js` / `AdvancedPlaceholder.jsx`** — placeholder Settings tool, pre-existing, not touched.

**Schema** (`cms/schemaTypes/`): `archiveItemType.js`, `projectType.js`, `themeType.js`, `journalEntryType.js`. These are the source of truth the frontend queries against — see §4 for exact field-by-field mapping. Treat the schema as locked; every query in `src/cms/queries.js` was written to match it exactly, not the other way around.

---

## 4. Frontend ↔ Sanity handshake

### 4.1 Client (`src/cms/client.js`)

```js
export const client = createClient({
  projectId: "zxmuvik1",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});
```

One client, hardcoded config (no env vars — see §9), no auth token (the dataset is public/read-only for the frontend). `useCdn: true` trades a little staleness for edge-cached reads, appropriate for a public portfolio site's read path.

### 4.2 Image URLs (`src/cms/imageUrl.js`)

Thin wrapper around `@sanity/image-url`'s builder: `urlFor(source)` returns a builder (chainable `.width()/.url()` etc.), not a plain string — callers that just need the current contract's plain-string `image` field call `.url()` themselves (see `queries.js`).

### 4.3 Queries (`src/cms/queries.js`)

One file, one query/normalize/fetch triad per content type. Pattern is identical across all three:

- **`ARCHIVE_ITEMS_QUERY`** — `*[_type == "archiveItem" && !(_id in path("drafts.**"))] | order(sortOrder asc) { ... }`. Resolves `project->slug.current` and `themes[]->title` to plain values (never raw reference objects downstream). Aliases schema's `description` → contract's `caption`. Deliberately excludes `privateNotes` (never queried by the shared query — see `scripts/verify-live-handshake.mjs`'s separate verification-only query for that field). `normalizeArchiveItem(raw, imageUrl)` reshapes into the exact pre-existing mock contract shape (`archiveNumber, image, theme, themes, tags, project, title, caption, location, date, displayRole, sortOrder`), with `theme` = `themes[0]`, `date` = `fullDate ?? String(year)`. `fetchArchiveItems()` is the async entry point.
- **`PROJECTS_QUERY`** — same pattern, ordered by `sortOrder asc` (schema-required field, unlike Archive Item's optional one). `slug` resolved to plain string. One real gap: the mock contract's `dates` field (a freeform display string, e.g. `"2023 – 2026"`) has **no schema equivalent** — only a numeric `year`. Traced every consumer and confirmed `dates` is currently unused anywhere in the render path, so `normalizeProject` leaves it `undefined` rather than inventing a schema field or a derived value.
- **`THEMES_QUERY`** — simplest of the three; schema is just `{title}`. No `sortOrder` field exists for Theme, so this orders alphabetically. Returns *every* Theme document in Sanity, not just ones currently referenced by an Archive Item (mirrors the same choice for Projects — the CMS is the source of truth for what exists, not what's currently tagged).

### 4.4 Content layer (`src/content/*.js`)

**The core reusable pattern**, established for Archive Items and repeated for Projects and Themes:

```js
let cachedX = [];
const LOAD_TIMEOUT_MS = 1800;

export async function loadX() {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS));
  try {
    const result = await Promise.race([fetchX(), timeout]);
    if (result === null) { console.error(...); return; }  // timed out
    cachedX = result;
  } catch (err) {
    console.error(...);  // network/query error
  }
  // No mock fallback on failure/timeout, either way — Sanity is the one
  // source of truth now, not a hybrid system with a silent fallback.
}

export function getX() {
  return cachedX;  // synchronous, always was, still is
}
```

Why: every existing caller of `getArchiveItems()`/`getProjects()`/`getThemes()` calls it synchronously, inline, with no loading-state handling — none of that call-site code was to be touched. Rather than push `async` through the whole app, the async boundary is contained entirely inside `content/`: one load, once, before first render (see §4.5), so by the time any component calls `getX()`, the cache is already warm.

`src/content/index.js` is the one barrel components import from — never reach into individual files, never import a mock data file directly. `mockArchiveItems.js`/`mockProjects.js` still exist on disk but are dead code (zero remaining imports outside their own files) — safe to delete once you're confident, left in place for now as a reference/rollback point.

`journalEntries.js` is the exception: `getJournalEntries()` just returns `[]`. No query, no live wiring — see §10.

### 4.5 Startup gate (`src/main.jsx`)

```js
useEffect(() => {
  Promise.all([loadArchiveItems(), loadProjects(), loadThemes()]).finally(() => {
    if (!cancelled) setIsRepositoryReady(true);
  });
}, []);

return (<><SplashScreen />{isRepositoryReady && <Router />}</>);
```

`<SplashScreen/>` mounts immediately (first paint unaffected); `<Router/>` — and everything under it, i.e. every component that reads live content — waits for all three loads to settle (success or logged failure) first. Adding a new content type's `loadY()` to this `Promise.all` is the one required step whenever a new live content type is wired up (see §12 for the trap this doesn't automatically save you from).

### 4.6 The module-scope trap (read this before adding new `getX()` calls)

`App.jsx` used to compute `PROJECT_TITLES`/`PROJECT_SLUG_BY_TITLE` as **module-level `const`s**, evaluated at import time — before `main.jsx`'s gate could possibly finish. Module-level code runs during the static import graph resolution, which happens *before* `main.jsx`'s own top-level statements (including the `useEffect` that starts the loads) ever run. So computing anything from `getProjects()`/`getThemes()`/`getArchiveItems()` at module scope permanently freezes it at whatever the cache held at import time — i.e., empty.

**Fix, and the rule going forward:** any read of live content-layer data must happen at render/call time (inside a component function body, a hook, an event handler), never as a module-level `const`. `PROJECT_TITLES`, `PROJECT_SLUG_BY_TITLE`, and `THEME_NAMES` all now live inside `App()`'s function body for exactly this reason. If you add a new `getX()` consumer, make sure it's not accidentally hoisted to module scope.

### 4.7 The gallery's image-pool join (`findArchiveItemBySrc`)

This was the subject of a full debugging pass — worth understanding if you touch the gallery.

`content/archiveItems.js`'s `findArchiveItemBySrc(src)` does `getArchiveItems().find(item => item.image === src)` — a plain string-equality join. The procedural gallery (`App.jsx`) calls this per tile to attach Archive Item metadata (`archiveNumber`, `project`, `theme`, `themes`, `tags`) onto whatever photo it's rendering.

This only works if `src` (whatever photo the gallery is currently drawing) is actually one of `getArchiveItems()`'s own `.image` values. Two pools exist:

- **Search/Filter pool** — `applyMetadataQuery` already builds it correctly: `buildImagePool(matched.map(item => item.image))`, where `matched` comes from `queryArchive(query, getArchiveItems())`. This pool's `src` values are live Archive Items' own image URLs, so the join always succeeds.
- **Default (unfiltered) homepage pool** — previously `DEFAULT_IMAGE_POOL`, built from `allImages` (34 hardcoded `/img/*.jpg` stock photos). Once Archive Items went live, `item.image` became a real `cdn.sanity.io` URL, which can never equal a static `/img/*.jpg` path. Every tile's join failed, silently, 100% of the time — hover cards always empty, gallery-tile→Project links always inert — regardless of whether the live fetch itself succeeded.

**Fix:** `App.jsx` now computes `DEFAULT_LIVE_IMAGE_POOL` at render time from `getArchiveItems().map(item => item.image)`, via the *same* `buildImagePool()` Search/Filter already used — no new mechanism. `activeImagePoolRef`'s initial value and what `resetArchiveState` resets it back to both use this live pool now. Falls back to the original static `DEFAULT_IMAGE_POOL` only if the live cache is empty (failed/timed-out load), so a bad load degrades the homepage to its old pre-handshake state instead of breaking every tile (`src: undefined` for everything).

**One necessary side effect:** `getOptimizedImageSrc`/`getOptimizedImageSrcSet` build paths into a build-time-generated directory (`/img/optimized/<width>/<name>.<ext>`) that only exists for the 34 static stock photos. A live Sanity URL has no corresponding file there. Added a small guard (`isLocalImageAsset`, checks for a leading `/img/`) so a non-local URL passes through unchanged instead of producing a broken path — not a redesign of the optimization pipeline, just the minimum needed for live photos to actually render. Real optimization of live images (responsive widths, webp) is explicitly deferred — see §11.

**One more disclosed side effect:** orientation bucketing (`getImageOrientation`) still keys off the static `image-metadata.json`, which has no entries for live URLs — every live image currently buckets as `"square"`, and since that's the only non-empty bucket for a live-only pool, `pickImage`'s existing empty-bucket fallback (`imagePool.all`) kicks in for every orientation request. Net effect: live tiles render, but the procedural layout isn't yet respecting their real aspect ratio. Also deferred to the polish pass (§11).

---

## 5. New abstractions

- **The `loadX()`/`getX()`/`cachedX` triad** in `src/content/*.js` — the reusable async-boundary-containment pattern described in §4.4. Apply this shape to any future live content type.
- **`normalizeX(raw)`** functions in `queries.js` — pure, no client/network dependency, one per content type, each responsible for the one place a schema field gets renamed/reshaped/defaulted to match the frontend's existing contract. Keep these pure; testable with a plain object, no live query needed.
- **`buildImagePool(imageSrcs)`** (pre-existing, in `App.jsx`) — now doing double duty: originally built only for Search/Filter's matched-subset pool, now also the mechanism behind the default homepage pool. Any future "pool of images the procedural gallery draws from" should go through this, not a new bespoke shape.
- **`unstableSignOut.js`** — the one file in the entire project allowed to import a non-`@public` Sanity API (`createAuthStore`). Isolation contract, stated in the file's own header comment: every other file that needs sign-out imports `unstableSignOut` from here, never `createAuthStore` directly. If you ever need another internal API, don't bolt it onto this file — Sanity's internals shift between versions, and this file's whole value is being the one place to check/update when that happens.

---

## 6. Key design decisions (and why)

- **One query file, one pattern, repeated** rather than one bespoke shape per content type. Makes the diff between Archive Items/Projects/Themes easy to compare and easy to extend for Journal Entries later.
- **No `perspective` config change**, despite the pinned `apiVersion: "2024-01-01"` predating Sanity's `raw`→`published` default-perspective change. `queries.js`'s explicit `!(_id in path("drafts.**"))` filter already excludes drafts regardless of the client's default perspective, so this is safe today without touching client config — flagged, not fixed, per "don't introduce behavioral changes where the current implementation is already correct."
- **No mock fallback on live-load failure**, anywhere. A failed/timed-out load logs loudly (`console.error`) and leaves the cache at its previous (usually empty, on first load) value — deliberately not a silent hybrid mock/live system.
- **Live-pool-with-static-fallback specifically for the gallery's image pool** (the one exception to "no fallback" above) — because a broken image pool breaks the entire homepage, a categorically worse failure mode than "some metadata is missing for a session." Metadata gaps degrade gracefully; an undefined `<img src>` for every tile does not.
- **CMS treated as the source of truth for existence, not just content** — Projects/Themes queries return every document that exists, not just ones currently referenced by an Archive Item (a brand-new Project or Theme with nothing tagged to it yet still shows up in filters).
- **`dates` (Project) dropped, not invented** — no schema field exists for it, and it's provably unused downstream; inventing a schema field or a derived value wasn't authorized scope.
- **Exactly one `@internal` Sanity API exception** (`unstableSignOut.js`), because no public sign-out API exists (confirmed three independent ways — see `authentication-investigation.md`), isolated to one file with retirement instructions baked into its own header comment.

---

## 7. Files/modules added or changed

**Frontend — new:**
- `src/cms/client.js`, `src/cms/imageUrl.js`, `src/cms/queries.js`
- `src/content/archiveItems.js`, `projects.js`, `themes.js`, `journalEntries.js` (stub), `index.js` (barrel)
- `scripts/verify-live-handshake.mjs` (`npm run verify:cms`)

**Frontend — modified:**
- `src/main.jsx` — startup readiness gate now awaits all three loads.
- `src/App.jsx` — `PROJECT_TITLES`/`PROJECT_SLUG_BY_TITLE`/`THEME_NAMES` moved to render-time; `DEFAULT_LIVE_IMAGE_POOL` added; `activeImagePoolRef`/`resetArchiveState` point at it; `getOptimizedImageSrc`/`getOptimizedImageSrcSet` gained the local-asset guard; `<Header>` now receives a `themes` prop.
- `src/mockArchiveItems.js`, `src/mockProjects.js` — no longer imported anywhere outside themselves; dead code, not deleted.

**CMS — new:**
- `cms/unstableSignOut.js`, `cms/components/UrbanumNavbar.jsx` (auth menu changes layered onto existing navbar)

**CMS — modified:**
- `cms/sanity.config.js` — added `auth` block.

*(Everything else under `cms/` — Import Workspace, the archive-sections navigation split, document action/inspector curation, theming, the tool menu — predates this phase of work; unchanged except where noted in §3.)*

---

## 8. Environment variables / setup requirements

**There are currently no environment variables anywhere in this project.** `projectId`/`dataset`/`apiVersion` are hardcoded in both `src/cms/client.js` (frontend) and `cms/sanity.config.js` (Studio) — deliberately, as the smallest vertical slice to prove the handshake, explicitly flagged as a pre-deploy follow-up (see §11). `.env` is gitignored but nothing currently reads one.

**Local setup:**
```bash
# Frontend
npm install
npm run dev            # vite dev server
npm run verify:cms     # standalone script, checks live Archive Items against
                        # the frontend contract (see §10 for its scope)
npm run build           # runs optimize:images (sharp, static /img pool only) then vite build

# Studio (separate app, separate install)
cd cms
npm install
npm run dev             # sanity dev, local Studio
npm run deploy          # sanity deploy, publishes hosted Studio
```

No auth token needed for the frontend — the `production` dataset is public/read-only from the client's perspective. If that ever changes (dataset made private), `client.js` will need a `token` and someone will need to decide how that token is supplied to a static-hosted SPA (this is a real open question, not solved here — see §10).

---

## 9. Known limitations

- **Journal Entries are entirely unwired.** Schema exists (`journalEntryType.js` — image, title, date, caption, privateNotes), but there's no query, no `fetchJournalEntries()`, and `getJournalEntries()` is a stub returning `[]`. `JournalPage.jsx` doesn't even call it today — it renders raw `allImages` URLs directly, not structured entries.
- **Gallery orientation bucketing doesn't yet respect live photos' real aspect ratio** — every live image buckets as `"square"` (see §4.7). Layout still works, just not orientation-aware for live content yet.
- **No responsive image optimization for live Sanity photos** — the raw `cdn.sanity.io` URL is used as-is (via the local-asset guard). No width variants, no webp negotiation. Sanity's own image URL builder (`urlFor(image).width(w).auto('format')`) is the natural fix, not yet done.
- **`verify-live-handshake.mjs` only covers Archive Items** — no equivalent contract check for Projects, Themes, or (once it exists) Journal Entries.
- **`ProjectsPage.jsx`** is fully hardcoded placeholder content (own tile data, own `allImages` slice) — not connected to `getProjects()` at all, not part of this handshake's scope, not linked from the homepage yet either. Easy to mistake for CMS-driven; it isn't.
- **Header's Year filter (`MOCK_YEARS`) is still fully mocked** — never addressed in this phase. `MOCK_PROJECTS` in `Header.jsx` is now dead code (real `projects` prop always passed) but still defined there.
- **No environment separation** — one hardcoded dataset (`production`) for both local dev and deployed prod. Testing against fake/bad content means editing the real dataset Josh uses.
- **No token/private-dataset support** — assumes the dataset stays public. If Josh ever wants unpublished/private content readable only by the frontend, this needs real design work (token handling in a static SPA is not trivial).
- **Failed live loads are silent to the end user** — logged to `console.error` only, no user-facing error state or retry. A slow/failed network on first visit just means missing metadata/images for that session with no visible explanation.
- **React 18 StrictMode double-invokes the three `load*()` calls in dev** — harmless (idempotent cache writes) but you'll see two fetches per type in the Network tab locally; not a bug.
- **`mockArchiveItems.js`/`mockProjects.js` still exist on disk**, imported by nothing — safe to delete, not yet done.

---

## 10. Future improvements

- Move `projectId`/`dataset`/`apiVersion` (and a `token`, if ever needed) into Vite env vars before any real production deploy hardening.
- Journal Entries: schema is ready; needs a query + content-layer wiring + actually rewiring `JournalPage.jsx` to consume structured entries instead of raw `allImages`.
- Image optimization pass for live photos (Sanity's own transform API), and orientation metadata via `image.asset->metadata.dimensions` (confirmed live and available — see engagement notes) instead of the static `image-metadata.json` lookup.
- Extend `verify-live-handshake.mjs` with `PROJECT_CONTRACT_FIELDS`/Theme checks, and a Journal Entries section once that query exists.
- Decide what happens to `ProjectsPage.jsx` (keep as a placeholder, wire to live Projects, or remove).
- Wire Header's Year filter to real data (currently `MOCK_YEARS`).
- If Sanity ever ships a public sign-out API, retire `unstableSignOut.js` (instructions are in its own header comment).
- If Sanity ever exposes a public per-document-footer mounting slot, revisit the Delete-button-next-to-Publish idea (currently blocked, not a schema/action limitation — see §2).
- Delete the now-dead `mockArchiveItems.js`/`mockProjects.js` once you're confident nothing references them (nothing does today).

---

## 11. Before you modify this system

- **Never compute anything from `getArchiveItems()`/`getProjects()`/`getThemes()`/`getJournalEntries()` at module scope.** Always inside a component body, hook, or handler — see §4.6. This bit the Projects phase once already.
- **If you add a pool of images the gallery draws from, its `src` values must come from `getArchiveItems()`'s own `.image` field**, or `findArchiveItemBySrc`'s join silently fails for every tile in that pool (see §4.7) — no error, just permanently empty metadata.
- **`unstableSignOut.js` is the only sanctioned `@internal` Sanity import in the project.** Don't add a second one elsewhere; extend/replace that file instead.
- **The Studio schema (`cms/schemaTypes/`) is the source of truth.** Every frontend query was written to match it field-by-field, not the reverse — if you need a new field on the frontend, add it to the schema first, then extend the matching query/`normalizeX` function, never invent a field client-side.
- **There are no automated tests.** `npm run verify:cms` is the only scripted check, and it only covers Archive Items (see §9). Everything else is manual QA.
- **The procedural gallery (`App.jsx`) is a large, carefully-sequenced system** (camera/zoom, entrance animation, virtualized render window, the image-pool/picker mechanism). This handoff only touched the pool's data source and the optimized-image guard — everything else in there is unchanged from what you already know, and small-looking changes there have a history of larger-than-expected blast radius. Read the file's own extensive inline comments before touching it.
