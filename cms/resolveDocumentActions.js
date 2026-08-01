import {useClient} from 'sanity'
import {useRouter} from 'sanity/router'
import {PENDING_DRAFTS_QUERY} from './components/ImportWorkspace'

const API_VERSION = '2024-01-01'

// Same id namespace createImportDrafts.js already stamps on every draft
// this tool creates, and the same namespace PENDING_DRAFTS_QUERY already
// matches against. Used here only to make sure this file's changes are
// scoped to documents Import Workspace itself created -- publishing an
// Archive Item or Journal Entry made any other way (typed directly into
// Structure, for instance) is completely unaffected.
const IMPORT_ID_PREFIX = 'urbanum-import-'

// Wraps Studio's own built-in "publish" document action -- the documented
// extension point for running code around an existing action without
// replacing it (see sanity.io/docs/document-actions, "Extending existing
// actions"). The default action itself is never re-implemented: this only
// decides where Studio goes *after* it runs, and only for this tool's own
// import drafts.
//
// Why this lives here and not in ImportWorkspace.jsx: by the time Josh is
// looking at the native document editor and clicking Publish,
// ImportWorkspace is already unmounted -- there is no component of this
// tool's own on screen to react to that click. Document Actions are the
// only documented hook Studio exposes for "something happened to this
// specific document," so reaching the "advance to the next draft" and
// "return to Import when the batch is done" behavior the user asked for
// requires this one new file, wired in via sanity.config.js's
// `document.actions` -- there was no smaller way to do it.
function wrapPublishAction(originalPublishAction) {
  function UrbanumImportPublishAction(props) {
    const original = originalPublishAction(props)
    const client = useClient({apiVersion: API_VERSION})
    const router = useRouter()

    // `props.id` is always the base document id (never drafts.-prefixed),
    // per Sanity's own DocumentActionProps -- the same convention
    // createImportDrafts.js's `baseId` and PENDING_DRAFTS_QUERY's stripped
    // `_id` already rely on.
    const isImportDraft = props.id.startsWith(IMPORT_ID_PREFIX)

    if (!isImportDraft || !original) return original

    return {
      ...original,
      onHandle: () => {
        // Runs the real publish exactly as Studio's own button always has
        // -- nothing about the publish mutation itself changes.
        original.onHandle()

        // Then looks for what's left, the same way ImportWorkspace's own
        // "Continue where you left off" already does on mount: re-derive
        // from Sanity, don't try to carry queue state across the
        // navigation. The just-published id is filtered out explicitly
        // rather than relied on to have already disappeared from the
        // query, since this fetch can race the publish mutation
        // completing server-side.
        client.fetch(PENDING_DRAFTS_QUERY).then(
          (remaining) => {
            const next = remaining.find(
              (doc) => doc._id.replace(/^drafts\./, '') !== props.id,
            )
            if (next) {
              // Client-side Intent navigation (sanity/router's
              // documented, @public router.navigateIntent) -- opens the
              // next draft without a full page reload. Unaffected by the
              // crash below: this always resolves against a real,
              // known-valid document id/type via the same 'edit' intent
              // "Continue Editing" already uses successfully elsewhere.
              router.navigateIntent('edit', {
                id: next._id.replace(/^drafts\./, ''),
                type: next._type,
              })
            }
            // When there's nothing left to advance to, this intentionally
            // does nothing further and leaves Josh wherever Studio's own
            // native post-publish behavior already puts him (the
            // document pane he was just looking at) -- no navigation
            // call needed here at all.
          },
          (error) => {
            console.error(
              '[resolveDocumentActions] Failed to check for remaining import drafts after publish.',
              error,
            )
          },
        )
      },
    }
  }

  return UrbanumImportPublishAction
}

// Ellipsis-menu cleanup pass ("document actions"): checked directly
// against the installed 6.7.0 structureTool bundle's own source
// (node_modules/sanity/lib/structureTool-*.js) rather than assumed --
// its `documentActions` array is exactly six built-in actions, in this
// order: Publish, Unpublish, Discard changes, Duplicate, Delete, Restore
// (history revert), identified internally by the literal ids "publish",
// "unpublish", "discardChanges", "duplicate", "delete", "restore". Every
// one of those six is offered on every document type in this Studio,
// completely unfiltered, until this change -- so opening any Archive
// Item, Project, Theme, or Journal Entry surfaced six raw Sanity
// operations at once, several of which only make sense once Josh
// understands drafts, publish state, or revision history, none of which
// this project needs him to.
//
// Kept: Publish (still wrapped above for Archive Item/Journal Entry's
// auto-advance; unwrapped everywhere else) and Delete.
//
// Delete is kept completely as-is -- not reimplemented, not relabeled,
// not given a custom dialog. Checked directly against the installed
// action itself (useDeleteAction, id "delete"): it already deletes every
// version of the document -- draft and published -- in one operation,
// already shows a real confirmation dialog ("Delete document?" / "Are
// you sure you want to delete all the versions of this document?"), and
// already warns if other documents reference the one being deleted (e.g.
// a Project other Archive Items still point to). That already satisfies
// this project's delete requirements (confirmation, obvious wording,
// safe, no draft/publish jargon in the visible copy) on its own --
// there's nothing to build.
//
// Dropped: Unpublish, Discard changes, and Restore -- not because
// they're unsafe, but because each only makes sense once Josh
// understands the specific Sanity concept it operates on (Unpublish:
// draft-vs-published visibility; Discard changes: reverting to
// last-published state, worded around "changes since last published";
// Restore: the revision-history timeline), and none of the three is
// needed to satisfy "delete something safely" -- Delete already covers
// that by itself. Each is a plausible later feature, not a capability
// silently removed with no way back (see the Future Enhancements notes
// from this pass's report).
//
// Also dropped, everywhere, for now: Duplicate. Not a general safety
// concern, but one concrete, verified side effect specific to this
// schema: ArchiveNumberInput.jsx only assigns a new Archive Number when
// the field is empty on mount (`if (!value) return` inside its own
// effect -- see that file). Sanity's Duplicate action copies every field
// value, including archiveNumber, onto the new document -- so
// duplicating an Archive Item would silently produce two documents
// sharing one Archive Number, which archiveItemType.js has no
// uniqueness validation to catch (unlike Project's `slug`, which does).
// That's a real, verified data-integrity risk for Archive Item/Journal
// Entry specifically, not a hypothetical one. Project and Theme don't
// share that exact risk, so Duplicate could reasonably come back for
// just those two later -- left out everywhere for now, consistent with
// this MVP's "simplicity over completeness" principle and the brief's
// own "Duplicate (optional)."
const KEPT_ACTIONS = new Set(['publish', 'delete'])

// The four document types Josh actually works with inside the Archive.
// Everything else this Studio might ever register (should Sanity add a
// built-in tool of its own, the way it already does for things like
// Scheduled Publishing -- see UrbanumToolMenu.jsx's own comment on that)
// keeps Studio's stock, unfiltered action list untouched.
const LIBRARY_DOCUMENT_TYPES = ['archiveItem', 'journalEntry', 'project', 'theme']

// The `document.actions` resolver sanity.config.js wires in.
export function resolveDocumentActions(prevActions, context) {
  if (!LIBRARY_DOCUMENT_TYPES.includes(context.schemaType)) {
    return prevActions
  }

  return prevActions
    .filter((action) => KEPT_ACTIONS.has(action.action))
    .map((action) => (action.action === 'publish' ? wrapPublishAction(action) : action))
}
