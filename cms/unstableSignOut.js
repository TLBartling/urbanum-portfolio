import {createAuthStore} from 'sanity'

// Authentication pass ("Option A" -- see authentication-investigation.md,
// delivered before any of this was written). THIS FILE IS THE ONE PLACE IN
// THE PROJECT that imports something from `sanity` not tagged `@public` in
// the installed 6.7.0 source. Every other `sanity` import this Studio
// makes -- `buildLegacyTheme`, `defineLocaleResourceBundle`,
// `useCurrentUser`, the `theme`/`navbar`/`i18n` config fields -- is either
// fully `@public`, or the already-investigated, disclosed `@hidden @beta`
// config-surface category (see sanity.config.js's own comments on
// `theme`/`studio.components`/`i18n`). `createAuthStore` is a different,
// stronger risk tier: `@internal`, at its own declaration
// (node_modules/sanity/lib/index-Z0jxEn8U.d.ts:11469; its lower-level
// implementation `_createAuthStore` carries the same tag one line above
// it, :11458).
//
// Why this exception exists: there is no public API for signing a user out
// of Studio. Confirmed three independent ways during investigation (full
// detail in authentication-investigation.md, "Question 4" and "Option A"):
// (1) the only interface with a `logout()` method, `AuthStore`, is
// `@beta @hidden` in the installed source (index-Z0jxEn8U.d.ts:2902); (2)
// the only function that can construct a working one, `createAuthStore`,
// is `@internal`; (3) a fresh search of Sanity's own live documentation
// (the "Custom authentication" guide, the AuthConfig reference, the CLI's
// unrelated `sanity logout` command) turned up no documented HTTP logout
// endpoint or public hook either. This was a disclosed, explicit trade-off
// -- "Option A" over "Option B" in that same document -- the user chose to
// make, not an oversight or a convenience shortcut.
//
// What this file does NOT do: use `createAuthStore` for anything but this
// one call, or touch any of `AuthStore`'s other members (`state`,
// `LoginComponent`, `handleCallbackUrl`, `token`) -- `logout()` is the only
// surface this project relies on.
//
// Isolation contract: this is the ONLY file in the project allowed to
// import `createAuthStore`, or anything else `@internal`, from `sanity`.
// Every other file that needs to let a user sign out imports
// `unstableSignOut` from here (UrbanumNavbar.jsx does, today) -- never
// `createAuthStore` directly. If Sanity's internals shift in a future
// version, or a public sign-out API ships, there is exactly one call site
// in this codebase to update, not a search-and-replace across it.
//
// How to retire this file: watch Sanity's changelog for a `@public`
// sign-out hook or a documented HTTP logout endpoint (neither existed as
// of this investigation, checked against 6.7.0). When one ships, replace
// this function's body with a call to the new public API, keep the same
// exported name and `Promise<void>` shape so every call site keeps
// working unchanged, then delete this comment block along with the
// investigation doc's "Option A" section.
//
// `projectId`/`dataset` are duplicated here from sanity.config.js's own
// literals rather than imported from there, deliberately: the point of
// this file is to stay a single, self-contained, easy-to-delete unit, not
// to gain an import dependency on the rest of the app's config wiring for
// two short strings. If this project's `projectId`/`dataset` ever change,
// update both places -- the same already-true constraint sanity.config.js
// itself has always had with `archiveSections.js`/`schemaTypes` importing
// nothing from it either.
const PROJECT_ID = 'zxmuvik1'
const DATASET = 'production'

/**
 * Signs the current user out of Studio. See the file-level comment above
 * for why this is the one place in the project allowed to reach into an
 * `@internal` Sanity API, and what to do if that ever stops being
 * necessary.
 *
 * Deliberately constructs a fresh `AuthStore` on demand rather than
 * holding one across renders -- this is called at most once per click, not
 * on a hot path, and a throwaway instance is simpler and easier to reason
 * about than trying to reach the *actual* store Studio's own `AuthBoundary`
 * booted with (which isn't exposed publicly either -- see the investigation
 * doc's Question 4). `logout()` clears the underlying session itself
 * (cookies/local storage, per its own doc comment: "expected to remove all
 * credentials both locally and on the server") -- shared, global state, not
 * something private to whichever store instance calls it.
 *
 * Note for whoever calls this: because the store this constructs isn't the
 * one Studio's own running `AuthBoundary` is subscribed to, that boundary
 * won't necessarily notice the session just cleared on its own. Callers
 * should force a full reload (not a client-side route change) right after
 * this resolves, so Studio re-boots, re-probes the now-cleared session, and
 * (with `auth.redirectOnSingle` in sanity.config.js) redirects straight
 * back into the Google flow -- see UrbanumNavbar.jsx's own Sign Out
 * handler for where that happens.
 */
export async function unstableSignOut() {
  const authStore = createAuthStore({projectId: PROJECT_ID, dataset: DATASET})
  if (typeof authStore.logout !== 'function') {
    // Not expected -- defensive only. If a future Sanity version removes
    // `logout` from the AuthStore shape this constructs, fail loudly here
    // instead of the Sign Out button silently doing nothing.
    throw new Error(
      'unstableSignOut: AuthStore.logout is no longer available in the ' +
        'installed Sanity version -- see the comment at the top of ' +
        'cms/unstableSignOut.js for the isolation this depends on, and ' +
        'authentication-investigation.md for the full investigation.',
    )
  }
  await authStore.logout()
}
