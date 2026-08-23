import { useEffect, useMemo, useRef, useState } from "react";

// Mobile Archive Interaction Pass -- Stage 4 (Mobile Search / Discovery
// Overlay): mobile UI mode's entire entrance into filtering. Replaces the
// desktop multi-tier Filter drawer on mobile -- NOT a smaller version of
// it, a purpose-built, single-screen, tap-and-go discovery surface,
// instantiated from Header.jsx (see the render there) rather than App.jsx,
// specifically so it can reuse Header's own child-page redirect handling
// (onSubmitSearch below) and the taxonomy props Header already receives,
// with no new plumbing threaded through App.jsx at all.
//
// Architecture (per the approved review): this component owns ONLY local
// UI state -- which category is being browsed doesn't even need tracking
// since every category renders at once (see below), so the only local
// state here is the typed draft query. Every prop this component receives
// is either a plain read (taxonomy arrays, current selection, the
// currently committed search/filter count for the "Clear all" control) or
// a callback into functions Header.jsx already owns (onOptionToggle wraps
// Header's own handleOptionToggle -- the exact same function the desktop
// drawer's own option clicks already call -- onSubmitSearch wraps Header's
// own search-commit logic, onClearAll wraps Header's own
// handleSearchClear/handleFilterClearAll). There is no second query
// engine, no second canonical filter state, and no second Project-filter
// mode here -- selecting Project still flows through the exact same
// activeFilterQuery.project test in App.jsx as every other path into
// Filter.
//
// Interaction model (per the approved review, "selecting one... closes
// the overlay"): tapping ANY Type/Theme/Year/Project option immediately
// toggles it (via the shared handleOptionToggle -- so tapping an already-
// selected option removes it, exactly like the desktop drawer) and closes
// the overlay in the same action -- a quick, single-shot discovery
// gesture rather than an accumulate-then-close session. Multiple filters
// across categories are still fully supported: `selection` persists
// across the overlay opening and closing, so a visitor can reopen Search
// and tap a second category to add to what's already active. Typed search
// (the free-text input) is the one exception -- it commits on its own
// explicit submit (Enter, or tapping a suggestion), independent of the
// option grid.
export default function MobileSearchOverlay({
  isOpen,
  onClose,
  entries,
  entryValues,
  entryLabels,
  selection,
  onOptionToggle,
  searchValue,
  onSearchValueChange,
  onSubmitSearch,
  committedSearch,
  totalFilterCount,
  onClearAll,
}) {
  const inputRef = useRef(null);

  // Focuses the typed-search input the instant the overlay opens -- the
  // same "land directly in the thing you're most likely to want" reasoning
  // desktop's own SEARCH toggle already uses (searchInputRef.current?.focus()
  // in handleSearchToggle), just re-applied here since this is a distinct
  // input element.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Same Escape-to-close convention the desktop Filter/Menu drawer already
  // uses (see Header.jsx's own Escape-key effect) -- kept as a fully
  // separate listener here rather than folding this overlay's open state
  // into that effect's own isDrawerOpen check, since this overlay is not
  // part of that shared drawer surface at all (see this file's own header
  // comment on why it's a purpose-built surface, not a mobile-shrunk
  // drawer).
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Autocomplete (per the approved review, "if it can be added cleanly...
  // without creating significant complexity"): a plain client-side
  // substring filter over the same taxonomy arrays already derived for the
  // option grid below -- no fuzzy-search library, no new matching engine.
  // Tapping a suggestion submits it exactly as if it had been typed and
  // Enter pressed (see handleSuggestionTap), so it rides the exact same
  // queryArchive substring match the typed input already uses -- this is
  // a UI convenience over that one existing engine, not a second one.
  const suggestions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return [];
    const pool = new Set([
      ...entryValues.type,
      ...entryValues.theme,
      ...entryValues.year,
      ...entryValues.project,
    ]);
    return Array.from(pool)
      .filter((value) => value.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchValue, entryValues]);

  if (!isOpen) return null;

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!searchValue.trim()) return;
    onSubmitSearch(searchValue.trim());
  };

  const handleSuggestionTap = (value) => {
    onSubmitSearch(value);
  };

  const hasActiveQuery = Boolean(committedSearch) || totalFilterCount > 0;

  return (
    <div
      className="mobile-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search and filter the Archive"
    >
      <form
        className="mobile-search-overlay__search-row"
        onSubmit={handleFormSubmit}
      >
        <input
          ref={inputRef}
          type="text"
          className="mobile-search-overlay__input"
          placeholder="Search the Archive"
          aria-label="Search"
          autoComplete="off"
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
        />
        <button
          type="button"
          className="mobile-search-overlay__close"
          onClick={onClose}
          aria-label="Close search"
        >
          <span aria-hidden="true">×</span>
        </button>
      </form>

      {suggestions.length > 0 && (
        <ul className="mobile-search-overlay__suggestions">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="mobile-search-overlay__suggestion"
                onClick={() => handleSuggestionTap(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasActiveQuery && (
        <button
          type="button"
          className="mobile-search-overlay__clear-all"
          onClick={onClearAll}
        >
          Clear {committedSearch ? "search" : ""}
          {committedSearch && totalFilterCount > 0 ? " & " : ""}
          {totalFilterCount > 0
            ? `${totalFilterCount} filter${totalFilterCount === 1 ? "" : "s"}`
            : ""}
        </button>
      )}

      <div className="mobile-search-overlay__categories">
        {entries.map(({ key, label }) => {
          const values = entryValues[key] ?? [];
          if (values.length === 0) return null;
          const selectedValues = selection[key] ?? [];

          return (
            <section
              className="mobile-search-overlay__category"
              key={key}
              aria-label={entryLabels[key] ?? label}
            >
              <h3 className="mobile-search-overlay__category-label">
                {entryLabels[key] ?? label}
              </h3>
              <div className="mobile-search-overlay__options">
                {values.map((value) => {
                  const isSelected = selectedValues.includes(value);
                  return (
                    <button
                      type="button"
                      key={value}
                      className={`mobile-search-overlay__option${
                        isSelected
                          ? " mobile-search-overlay__option--selected"
                          : ""
                      }`}
                      aria-pressed={isSelected}
                      onClick={() => onOptionToggle(key, value)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
