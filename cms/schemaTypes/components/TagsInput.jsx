import {useEffect, useRef} from 'react'
import {set} from 'sanity'
import {normalizeTag} from '../../normalizeTag'

// Auto-normalization pass ("Tag formatting"): wraps the Tags field's own
// default Studio input -- resolved, unmodified, via `renderDefault` --
// and layers exactly one thing on top of it: whenever the field's
// committed tag array changes, if any tag isn't already in its
// normalized form, silently re-set() it to the normalized version (see
// normalizeTag.js for the shared rule). Josh never sees a formatting
// step; a tag he types as "light" simply reads back as "Light" the
// moment it becomes a chip.
//
// `tags` stays exactly what it already was in the schema -- a plain
// `array of string` with `options: {layout: 'tags'}` -- and this
// component still resolves to Sanity's own built-in TagsArrayInput
// underneath (confirmed directly against the installed sanity@6.7.0
// source: `resolveArrayInput` picks TagsArrayInput for exactly this
// shape). Nothing about the chip UI, the keyboard flow, or the field's
// public contract changes; this only intercepts what gets written.
//
// Why an effect watching `value`, not a wrapped `onChange`: the
// installed TagsArrayInput's own onChange always sends a single,
// full-array set() (or unset() if the array becomes empty) -- confirmed
// directly against the installed source -- but branching on *which*
// patch type that is would mean reading FormPatch's own `type`
// discriminant, which the installed type definitions mark `@internal`
// ("should not be used by consumers"). Watching the already-resolved
// `value` prop and calling the fully public `set()` helper (the same
// one ArchiveNumberInput.jsx already relies on) sidesteps that
// entirely -- it doesn't matter what produced the new value, only
// whether that value still needs normalizing.
//
// Only ever fires on a COMMITTED tag (Enter, comma, paste, or a chip
// removed) -- @sanity/ui's own TagInput (what TagsArrayInput renders
// internally) keeps whatever's currently being typed as its own
// uncontrolled text state, never as part of the field's `value` -- so
// this can never fight Josh mid-keystroke or move his cursor.
//
// Deliberately SKIPS the first render (the `isFirstRender` guard below):
// without it, simply opening an existing Archive Item whose tags predate
// this change would immediately fire a set() and silently mark that
// document as having an unpublished draft change Josh never made. This
// component should only ever normalize a tag in direct response to Josh
// actually touching the field during this editing session -- not as a
// side effect of opening a document to look at it. Existing documents'
// tags are therefore untouched by this component until Josh next edits
// that field himself; see this pass's own report for the one-time
// migration option if every existing tag needs normalizing sooner than
// that.
export function TagsInput(props) {
  const {value, onChange, renderDefault} = props
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!value || value.length === 0) return

    const normalized = value.map(normalizeTag)
    const needsNormalizing = normalized.some((tag, index) => tag !== value[index])

    if (needsNormalizing) onChange(set(normalized))
  }, [value, onChange])

  return renderDefault(props)
}
