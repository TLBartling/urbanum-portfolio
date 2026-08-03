import {useCallback, useState} from 'react'
import {useClient} from 'sanity'
import {Flex, Stack, Text, useToast} from '@sanity/ui'
import {TrashIcon} from '@sanity/icons/Trash'

const API_VERSION = '2024-01-01'

// Urbanum-specific replacement for Theme's built-in Delete action -- see
// resolveDocumentActions.js's own comment for exactly which document
// types get this (Theme only) and why Delete stays untouched everywhere
// else.
//
// Why this exists: Sanity's built-in Delete simply refuses to run
// whenever another document references the one being deleted. For a
// Theme, that's every Archive Item it's tagged on -- so in real use,
// Delete on a Theme just fails with a reference-integrity error Josh has
// no reason to understand or recover from. Remove Theme performs the
// obviously-intended cleanup itself: strip the theme from every Archive
// Item that references it, then delete the Theme -- automatically,
// safely, behind one confirmation that tells Josh exactly what's about
// to happen in plain language, not Sanity's internal terms.
//
// Built entirely on public APIs this Studio already relies on elsewhere:
// useClient (same as resolveDocumentActions.js's own wrapPublishAction),
// the @sanity/client transaction/patch API (the standard, documented
// tool for "patch several documents and delete one, atomically"), and
// @sanity/ui's useToast (@public) for error feedback. No @internal
// import of any kind -- unlike unstableSignOut.js, there's no reason for
// one here; everything this action needs is already public.

// Every Archive Item document VERSION (draft and/or published -- they're
// separate document ids) that currently references either the Theme's
// published id or its drafts.-prefixed id, covering a Theme that only
// ever existed as a draft. Deliberately not filtered to published-only
// the way the frontend's own queries are (src/cms/queries.js) -- this
// needs to find and clean up every reference that could block deletion,
// including ones only Josh's own in-progress edits can currently see.
const REFERENCING_ARCHIVE_ITEMS_QUERY = `
  *[_type == "archiveItem" && references($id, $draftId)]._id
`

// A document that's simultaneously a referencing draft and a referencing
// published version is one Archive Item to Josh, not two -- dedupe by
// stripping the drafts. prefix before counting, so the confirmation
// dialog's "assigned to X Archive Items" matches what he'd actually see
// in the Archive Items list, not Sanity's internal document-version count.
function dedupedArchiveItemCount(referencingIds) {
  return new Set(referencingIds.map((docId) => docId.replace(/^drafts\./, ''))).size
}

// The three consequence lines shown in the confirmation dialog below.
// Static copy, not live data -- a plain module-level array, same as any
// other constant in this file.
//
// Rendered as Stack + Flex rows (each row: a muted bullet glyph Text +
// a label Text), not a native <ul>/<li> -- @sanity/ui's own Text
// component renders as a <div><span>...</span></div> (confirmed against
// the installed package's own source), and that div-per-line output
// collided with the native list's box model enough to visibly overlap
// (reported by Josh via screenshot). @sanity/ui has no dedicated
// List/ListItem primitive to reach for instead (checked the installed
// package's own export surface), so this uses the same Flex/Stack/Text
// composition every other bulleted or row-based layout in this Studio
// already uses (see ImportWorkspace.jsx) rather than fighting the native
// list element.
const REMOVE_THEME_CONSEQUENCES = [
  'Remove the theme from every Archive Item that references it.',
  'Keep every Archive Item intact.',
  'Remove the Theme from the CMS.',
]

// Atomicity is the whole point of using a transaction here rather than
// awaiting each patch and then separately awaiting a delete: every
// Archive Item patch and both of the Theme's own delete mutations
// (draft + published -- mirrors the built-in Delete action, which
// "already deletes every version of the document... in one operation",
// per resolveDocumentActions.js's own comment on it) are added to ONE
// transaction and committed together. If the server rejects any single
// mutation in it, none of them apply -- there is no window where the
// Archive Item patches succeeded but the Theme wasn't deleted yet, or
// vice versa. That's what actually guarantees "if any patch fails, abort
// deletion, leave everything unchanged," not careful manual sequencing.
async function removeThemeAndCleanUp(client, id, draftId) {
  const referencingIds = await client.fetch(REFERENCING_ARCHIVE_ITEMS_QUERY, {id, draftId})

  const tx = client.transaction()

  referencingIds.forEach((archiveItemId) => {
    tx.patch(archiveItemId, {
      // JSONMatch predicate unset -- removes only the array element(s)
      // whose _ref matches (the same mechanism @sanity/client documents
      // for removing one item from an array, e.g. tags[_key=="tag1"]).
      // Preserves every other Theme reference on the item, every other
      // field, and the Archive Item document itself -- this can never
      // touch anything but the `themes` array entries that point at
      // this exact Theme.
      unset: [`themes[_ref=="${id}"]`, `themes[_ref=="${draftId}"]`],
    })
  })

  // Deleting a document id that doesn't exist (e.g. a Theme with no
  // draft, or one with no published version yet) is a documented no-op
  // in Sanity's mutation API, not an error -- safe to include both
  // unconditionally rather than checking existence first.
  tx.delete(id)
  tx.delete(draftId)

  await tx.commit()
}

export function RemoveThemeAction(props) {
  // Per Sanity's own DocumentActionProps convention (already relied on
  // by resolveDocumentActions.js's wrapPublishAction): id is always the
  // base document id, never drafts.-prefixed.
  const {id, onComplete} = props
  const draftId = `drafts.${id}`

  const client = useClient({apiVersion: API_VERSION})
  const toast = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [archiveItemCount, setArchiveItemCount] = useState(null)
  const [isCountLoading, setIsCountLoading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleClose = useCallback(() => {
    setDialogOpen(false)
    setArchiveItemCount(null)
  }, [])

  // Opens the dialog immediately on click (no dead pause waiting on a
  // network round-trip before anything visibly happens), then fills in
  // the real count once it resolves -- see the dialog's message below
  // for the "…" placeholder this fills in.
  const handleOpen = useCallback(() => {
    setDialogOpen(true)
    setIsCountLoading(true)
    client
      .fetch(REFERENCING_ARCHIVE_ITEMS_QUERY, {id, draftId})
      .then((referencingIds) => {
        setArchiveItemCount(dedupedArchiveItemCount(referencingIds))
        setIsCountLoading(false)
      })
      .catch((error) => {
        setIsCountLoading(false)
        setDialogOpen(false)
        toast.push({
          status: 'error',
          title: 'Could not check Theme usage',
          description: error.message,
        })
      })
  }, [client, id, draftId, toast])

  const handleConfirm = useCallback(() => {
    // Guards against confirming before the count (and therefore a fresh
    // read of what's actually referencing this Theme) has resolved --
    // narrow in practice, since this is a single lightweight query, but
    // free to prevent outright.
    if (isCountLoading || isRemoving) return

    setIsRemoving(true)
    removeThemeAndCleanUp(client, id, draftId)
      .then(() => {
        setIsRemoving(false)
        setDialogOpen(false)
        toast.push({status: 'success', title: 'Theme removed'})
        onComplete()
      })
      .catch((error) => {
        // The transaction failed to commit -- nothing was written (see
        // removeThemeAndCleanUp's own comment on why a transaction is
        // what guarantees that). Leave the dialog open so Josh can see
        // what happened and decide what to do next, rather than closing
        // on a failure he never asked to accept.
        setIsRemoving(false)
        toast.push({
          status: 'error',
          title: 'Could not remove Theme',
          description: error.message,
        })
      })
  }, [client, id, draftId, toast, onComplete, isCountLoading, isRemoving])

  const archiveItemLabel = archiveItemCount === 1 ? 'Archive Item' : 'Archive Items'

  return {
    label: 'Remove Theme',
    icon: TrashIcon,
    tone: 'critical',
    title: 'Remove Theme',
    disabled: isRemoving,
    onHandle: handleOpen,
    dialog: dialogOpen && {
      type: 'confirm',
      tone: 'critical',
      confirmButtonText: isRemoving ? 'Removing…' : 'Remove Theme',
      cancelButtonText: 'Cancel',
      onConfirm: handleConfirm,
      onCancel: handleClose,
      message: (
        <Stack space={4}>
          <Text size={1}>
            This theme is currently assigned to{' '}
            <strong>
              {isCountLoading ? '…' : archiveItemCount} {archiveItemLabel}
            </strong>
            .
          </Text>
          <Stack space={2}>
            <Text size={1}>Removing this theme will:</Text>
            <Stack space={2} paddingLeft={3}>
              {REMOVE_THEME_CONSEQUENCES.map((line) => (
                <Flex key={line} gap={2} align="flex-start">
                  <Text size={1} muted>
                    &bull;
                  </Text>
                  <Text size={1}>{line}</Text>
                </Flex>
              ))}
            </Stack>
          </Stack>
          <Text size={1}>
            <strong>This action cannot be undone.</strong>
          </Text>
        </Stack>
      ),
    },
  }
}

// Marks this as occupying the "delete" slot for the document types that
// use it -- matches Sanity's own convention when a config replaces a
// built-in action (see DocumentActionComponent's own `action` field);
// not required for resolveDocumentActions.js's swap logic (that matches
// against the *original* built-in action's `.action`, not this one's),
// but correct for anything else that might ever introspect this action.
RemoveThemeAction.action = 'delete'
RemoveThemeAction.displayName = 'RemoveThemeAction'
