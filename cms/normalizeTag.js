// Shared by the two places an Archive Item's Tags array can actually be
// created or edited: the Tags field's own custom input
// (schemaTypes/components/TagsInput.jsx, for the native Studio document
// editor) and Import Workspace's own Tags entry (components/
// ImportWorkspace.jsx's onAttach/onCreate handlers). One canonical rule
// here, applied at both, so a tag typed through either path ends up in
// exactly the same form -- which is the whole point: "light", "Light",
// " LIGHT ", and "light " should all become the one tag "Light", however
// Josh happens to type it or wherever he types it.
//
// Rule: trim leading/trailing whitespace, collapse internal runs of
// whitespace to a single space, then Title Case each whitespace-
// separated word (first character uppercased, the rest of that word
// lowercased). Punctuation is never touched -- a hyphen, apostrophe, or
// any other character stays exactly where it was; only the letters
// around it change case. "modern architecture" -> "Modern Architecture".
//
// Idempotent by construction: normalizeTag(normalizeTag(x)) always
// equals normalizeTag(x). That's required by TagsInput.jsx, which
// re-runs this on every committed change to the field and relies on an
// already-normalized value producing no further change (otherwise it
// would loop).
export function normalizeTag(rawTag) {
  const collapsed = String(rawTag).trim().replace(/\s+/g, ' ')
  if (!collapsed) return collapsed

  return collapsed
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ')
}
