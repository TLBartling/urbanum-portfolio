import {useEffect, useState} from 'react'
import {useClient, useFormValue} from 'sanity'
import {useIntentLink} from 'sanity/router'
import {Button, Flex, Text} from '@sanity/ui'

const API_VERSION = '2024-01-01'

// CMS Type Context pass: a read-only display only. This component never
// calls `onChange`, and the field it backs (see the `typeContext` field
// on archiveItemType.js) is never assigned a stored value -- nothing is
// ever written here, and nothing is ever written back to the linked
// Project either. Type itself lives in exactly one place: the
// `projectTypes` array-of-references field on the `project` document
// (see schemaTypes/projectType.js). This component only makes that
// existing value visible -- and, where practical, one click away to edit
// -- from the Archive Item screen it's actually relevant to, without
// duplicating where it's stored.
//
// Deliberately NOT editable from here: making Type editable on the
// Archive Item would mean patching a *different* document (the Project)
// from this one's form -- and since many Archive Items typically share
// one Project, an edit made while looking at a single photo would
// silently change the Type(s) for every other Archive Item on that same
// Project. That's a meaningfully different, riskier feature than a
// read-only display, and wasn't requested -- see the CMS Type Context
// pass's own report.
//
// CMS Type Multi-Select pass: a Project can now belong to one or more
// Types (see projectType.js's own `projectTypes` field). This component
// resolves and shows ALL of them, comma-separated -- "Not set" only when
// the linked Project truly has none.
//
// `useFormValue(['project'])` (public API, confirmed against the
// installed sanity@6.11.0 package) reads the CURRENT in-form value of
// this document's own `project` reference field -- not the last-
// published value -- so this updates immediately if Josh changes which
// Project an Archive Item is linked to, before ever saving.
export function TypeContextField() {
  const projectRef = useFormValue(['project'])
  const projectId = projectRef && projectRef._ref ? projectRef._ref : null

  const client = useClient({apiVersion: API_VERSION})
  const [status, setStatus] = useState('idle') // idle | loading | loaded | error
  const [projectDoc, setProjectDoc] = useState(null)

  useEffect(() => {
    if (!projectId) {
      setStatus('idle')
      setProjectDoc(null)
      return undefined
    }

    let cancelled = false
    setStatus('loading')

    // Drafts-inclusive on purpose, same reasoning ArchiveNumberInput.jsx's
    // own drafts-inclusive query already documents: a reference always
    // stores the published id, but Josh is often looking at a Project's
    // still-unpublished edits (its draft) -- this should reflect what
    // he'd see if he opened that Project right now, not a stale
    // published Type. Draft is preferred when both exist.
    //
    // CMS Type Multi-Select pass: `projectTypes[]->title` (the new array
    // field) is preferred; `select()` falls back to the old single
    // `projectType->title` reference, wrapped as a one-item array, for
    // any Project not yet migrated -- see migrateProjectTypeToArray.js.
    // This keeps this component correct whether or not that migration
    // has run yet against a given Project.
    const projection =
      '{title, "typeTitles": select(defined(projectTypes) => projectTypes[]->title, defined(projectType) => [projectType->title], [])}'

    Promise.all([
      client.fetch(`*[_id == $id][0]${projection}`, {id: `drafts.${projectId}`}),
      client.fetch(`*[_id == $id][0]${projection}`, {id: projectId}),
    ])
      .then(([draft, published]) => {
        if (cancelled) return
        setProjectDoc(draft || published || undefined)
        setStatus('loaded')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [client, projectId])

  // Documented Intent API (sanity/router's useIntentLink, `@public` --
  // see its own doc comment in the installed package). `params` is
  // always a real object, never undefined, even with no project linked
  // yet -- the button simply isn't rendered in that case (see below), so
  // an empty id here is never actually clickable.
  const {href, onClick} = useIntentLink({
    intent: 'edit',
    params: {id: projectId || '', type: 'project'},
  })

  let valueText = 'No project linked'
  if (projectId) {
    if (status === 'loading' || status === 'idle') {
      valueText = 'Loading…'
    } else if (status === 'error' || projectDoc === undefined) {
      valueText = 'Unable to load'
    } else {
      const titles = (projectDoc && projectDoc.typeTitles) || []
      valueText = titles.length > 0 ? titles.join(', ') : 'Not set'
    }
  }

  return (
    <Flex align="center" gap={3}>
      <Text size={1}>{valueText}</Text>
      {projectId && (
        // CMS Type Context UI Polish pass: previously a bare <a>, which
        // rendered with the browser's own default blue link styling --
        // out of step with every other control in this Studio (see
        // AnnotationField.jsx's own comment on why `tone="default"`, not
        // `tone="primary"`/stock blue, is this project's established
        // convention for a button that isn't a destructive or primary
        // action). @sanity/ui's Button is polymorphic (`as` prop,
        // confirmed against the installed package's own type
        // declarations) -- rendering `as="a"` keeps this a real anchor
        // with a real `href`, so the existing useIntentLink navigation
        // (`href`/`onClick`, the documented pair from its own usage
        // example) is unchanged; only the visual chrome moved from the
        // browser's default link style to this Studio's own neutral
        // button treatment. `mode="ghost"` + `tone="default"` is the same
        // understated, non-blue combination this project already uses
        // throughout (AnnotationField's chip buttons, ImportWorkspace's
        // own secondary actions) -- not a new style invented for this one
        // control.
        <Button
          as="a"
          href={href}
          onClick={onClick}
          text="Edit Project"
          mode="ghost"
          tone="default"
          fontSize={1}
          padding={2}
        />
      )}
    </Flex>
  )
}
