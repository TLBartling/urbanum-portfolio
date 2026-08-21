import {useEffect, useRef, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'

// UI polish pass ("Disable browser autofill"): same reasoning and same
// values as ImportWorkspace.jsx's own noBrowserAutofillProps (this file
// doesn't import from there, so it's a small, literal duplicate rather
// than a new shared module for five key/value pairs) -- stops the
// browser/OS from offering its own saved values on this component's
// input. Doesn't touch, and isn't related to, this component's own
// suggestion dropdown below (`rows`/`matches`), which is plain React
// state and rendering, not a browser autofill mechanism.
const noBrowserAutofillProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
}

// AnnotationField -- Urbanum's own small combobox, built specifically for
// one interaction: type, see what already exists, press Enter to attach it
// or create it if it doesn't exist yet, watch it become a chip. Project
// and Theme both use this instead of Sanity's Autocomplete.
//
// That's a deliberate choice, not a stylistic one. Checked directly against
// the installed @sanity/ui 6.7.0 source (not just its type declarations):
// Autocomplete's own keyboard model only resolves Enter against an option
// the user has already arrow-keyed to -- typing a full name and pressing
// Enter immediately does nothing, because its internal `activeValue` resets
// to null on every keystroke and nothing auto-highlights a match. That's
// the opposite of "type, Enter, done," which is the one thing this
// component exists to do. Working around that would mean intercepting
// Enter ourselves anyway while still carrying Autocomplete's own selection
// machinery alongside it -- two overlapping ways of producing the same
// result. Owning the whole interaction directly, in well under 200 lines,
// was the simpler and more honest choice.
//
// What this component owns: the text input, filtering suggestions against
// what's typed, which row is highlighted, and every keystroke that matters
// (arrows, Enter, Escape, Backspace-removes-last-chip) -- plus rendering
// the chips and the trailing "Create" row. What it does NOT own: creating a
// Project or Theme document, any Sanity mutation, or any idea of what a
// reference vs. a plain string is. The caller normalizes everything into
// plain {id, label} objects beforehand and supplies onAttach/onCreate/
// onRemove callbacks -- this file has no schema knowledge and makes no
// network calls of its own.
//
// Cardinality (Project = one chip, Theme = many) is the one place
// callers differ, via `multiple`. Everything else -- the typing, the
// suggestions, the keyboard flow, the chip look -- is identical on
// purpose, since that sameness is the entire point of this component.
export function AnnotationField({
  id,
  label,
  placeholder,
  items,
  suggestions,
  multiple = true,
  creating = false,
  onAttach,
  onCreate,
  onRemove,
  className,
  style,
}) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef(null)

  // Project hides its input the moment it has a chip -- there's nowhere
  // else for a second one to go. Theme keeps its input visible always, so
  // the next entry is one keystroke away. Refocusing when the input
  // reappears (e.g. Project's chip just got removed) is what keeps "clear
  // it, type the replacement" feeling like one motion instead of two.
  const showInput = multiple || items.length === 0
  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  const attachedIds = new Set(items.map((item) => item.id))
  const normalizedQuery = query.trim().toLowerCase()
  const matches = normalizedQuery
    ? suggestions.filter(
        (option) =>
          !attachedIds.has(option.id) && option.label.toLowerCase().includes(normalizedQuery),
      )
    : []
  const hasExactMatch = matches.some(
    (option) => option.label.trim().toLowerCase() === normalizedQuery,
  )
  // The "Create" row is what replaces the old separate "+ New" button --
  // attaching and creating now live in the same list, resolved by the same
  // Enter key. It only shows once something's typed and it doesn't already
  // exist under that exact name.
  const rows =
    normalizedQuery === ''
      ? []
      : hasExactMatch
        ? matches
        : [...matches, {id: '__create__', label: query.trim(), create: true}]
  const activeIndex = rows.length ? Math.min(highlightedIndex, rows.length - 1) : 0

  function resolveRow(row) {
    if (!row || creating) return
    if (row.create) {
      onCreate(row.label)
    } else {
      onAttach(row)
    }
    setQuery('')
    setHighlightedIndex(0)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (rows.length) setHighlightedIndex((current) => (current + 1) % rows.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (rows.length) setHighlightedIndex((current) => (current - 1 + rows.length) % rows.length)
    } else if (event.key === 'Escape') {
      setQuery('')
    } else if (event.key === 'Enter') {
      event.preventDefault()
      resolveRow(rows[activeIndex])
    } else if (event.key === 'Backspace' && query === '' && items.length > 0) {
      onRemove(items[items.length - 1])
    }
  }

  return (
    <Stack space={2}>
      {/* Round F ("Metadata chip colors"): these were `tone="primary"` --
          the one place in this whole project (grepped to confirm) that
          still rendered Sanity's stock theme blue, missed by an earlier
          pass that swept every other `tone="primary"` in
          ImportWorkspace.jsx itself (this is a separate file, so it was
          skipped). Selected chips represent attached values, not links,
          so `tone="default"` -- the same tone every other button in this
          project already uses for its ordinary ink-colored text -- reads
          correctly here without any color needing to be forced through
          Button's own internal text rendering (a fight this project has
          already lost once; see ImportWorkspace.jsx's inverseButtonStyle
          comment for why `tone`/`mode` is the reliable lever, not an
          inline `color` override). */}
      {items.length > 0 && (
        <Flex wrap="wrap" gap={2}>
          {items.map((item) => (
            <Button
              key={item.id}
              text={`${item.label} ×`}
              mode="ghost"
              tone="default"
              style={{fontWeight: 500}}
              onClick={() => onRemove(item)}
            />
          ))}
        </Flex>
      )}

      {showInput && (
        <Box style={{position: 'relative'}}>
          <TextInput
            {...noBrowserAutofillProps}
            ref={inputRef}
            id={id}
            aria-label={label}
            value={query}
            placeholder={creating ? 'Creating…' : placeholder}
            disabled={creating}
            className={className}
            style={style}
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-autocomplete="list"
            onChange={(event) => {
              setQuery(event.currentTarget.value)
              setHighlightedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setQuery('')}
          />

          {rows.length > 0 && (
            <Card
              radius={0}
              shadow={2}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 20,
                marginTop: 4,
              }}
            >
              <Stack as="ul" space={0} role="listbox">
                {rows.map((row, index) => (
                  <Box as="li" key={row.id} role="option" aria-selected={index === activeIndex}>
                    {/* Archive polish audit: the highlighted/active row here
                        was still `tone="primary"` -- Sanity's stock theme
                        blue, the same class of leftover Round F's own
                        comment above already found and fixed once in this
                        exact file (the attached-value chips), just missed
                        here since it's a second, separate `tone` usage a
                        few lines down. Fixed the same way: `tone="default"`
                        always, with the ink-tinted wash `selectedChipStyle`
                        already uses in ImportWorkspace.jsx
                        (`rgba(17, 17, 17, 0.08)`) applied directly via
                        `style` for the active row instead, so "this row is
                        highlighted" still reads clearly without routing
                        through Sanity's own blue. */}
                    <Card
                      as="button"
                      type="button"
                      padding={3}
                      radius={0}
                      tone="default"
                      // mousedown (not click) + preventDefault, so choosing
                      // a row never blurs the input first -- the same
                      // trick Autocomplete itself uses internally, just
                      // without needing its setTimeout/relatedElements
                      // machinery, since this component only ever has one
                      // listbox to worry about.
                      onMouseDown={(event) => {
                        event.preventDefault()
                        resolveRow(row)
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        backgroundColor: index === activeIndex ? 'rgba(17, 17, 17, 0.08)' : undefined,
                      }}
                    >
                      <Text size={1}>{row.create ? `Create "${row.label}"` : row.label}</Text>
                    </Card>
                  </Box>
                ))}
              </Stack>
            </Card>
          )}
        </Box>
      )}
    </Stack>
  )
}
