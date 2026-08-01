import {defineLocaleResourceBundle} from 'sanity'

// Archive polish pass ("Empty states"): overrides one built-in Studio
// string via `defineLocaleResourceBundle` -- confirmed `@public` (not
// `@deprecated`, unlike `buildLegacyTheme`) directly against the installed
// sanity@6.7.0 source. Checked the exact key rather than guessed: an empty
// Archive Items/Projects/Themes/Photo Journal list renders the literal
// string `"panes.document-list-pane.no-documents-of-type.text"` from
// Studio's own "structure" locale namespace (`node_modules/sanity/lib/
// resources-DdpIsFj_.js`), which resolves to "No documents of this type" --
// raw CMS language, not something Urbanum would say.
//
// This key has no per-type interpolation (confirmed in the same resource
// file -- no `{{type}}` placeholder), so the replacement text has to read
// naturally for all four Archive sections at once, not just one of them.
// A fully tailored, per-type empty state (e.g. Photo Journal's specifically
// pointing back to Import) would need a custom component per list --
// out of scope for this polish pass; this is the documented, low-cost
// version of the same fix.
//
// Registered via `i18n.bundles` in sanity.config.js. Note: `i18n` itself is
// tagged `@hidden @beta` on the config object it's set on (same category as
// `navbar`/`toolMenu`/`activeToolLayout`/`theme`, already investigated
// elsewhere in this project and concluded to be version lag against
// Sanity's live docs rather than a genuine internal-API risk) -- but
// `defineLocaleResourceBundle` itself, the function actually used here, is
// unambiguously `@public`.
export const urbanumStructureStrings = defineLocaleResourceBundle({
  locale: 'en-US',
  namespace: 'structure',
  resources: {
    'panes.document-list-pane.no-documents-of-type.text': 'Nothing here yet.',
  },
})
