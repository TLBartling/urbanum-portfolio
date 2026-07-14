import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Mock catalog values for the index drawer. These are the seam a developer
// swaps for real CMS data later: point `themes` / `projects` / `years` at
// CMS-driven arrays via props (e.g. <Header themes={cmsThemes} .../> from
// App), and everything below -- markup, interaction, animation -- keeps
// working unchanged. Nothing in this file assumes these arrays are static.
const MOCK_THEMES = [
  "Residential",
  "Commercial",
  "Hospitality",
  "Urban Design",
  "Research",
  "Competitions",
  "Material Studies",
  "References",
];

const MOCK_PROJECTS = [
  "Meridian House",
  "Glass Pavilion",
  "Kobo Complex",
  "Linden Court",
  "Sable Tower",
];

const MOCK_YEARS = ["2026", "2025", "2024", "2023", "Earlier"];

// Each entry is one column of the index drawer's category row. "key" maps
// into both the value arrays above and the selection state below.
const INDEX_ENTRIES = [
  { key: "theme", label: "Theme" },
  { key: "project", label: "Project" },
  { key: "year", label: "Year" },
];

// How many archive terms the Active Content Panel shows before offering
// "View All" to reveal the complete index for that Context.
const PREVIEW_COUNT = 6;

// Derives the curated preview of a category's full value list. Today this
// is simply "the first PREVIEW_COUNT values," but it's kept as its own
// seam on purpose: this is the one place that decides what counts as
// "preview." Swap this for a function that reads a CMS-curated preview
// (e.g. a `featured` flag per value, or an editor-picked subset) and
// nothing else -- the expand state, the "is there more to reveal" check,
// or the View All control -- needs to change.
const getPreviewValues = (allValues) => allValues.slice(0, PREVIEW_COUNT);

export default function Header({
  themes = MOCK_THEMES,
  projects = MOCK_PROJECTS,
  years = MOCK_YEARS,
  onFilterOpenChange,
  onFilterChange,
  onDrawerHeightChange,
}) {
  // Whether the header has unfolded its subheader (category row) at all.
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Once the initial slow expansion has finished, the drawer is "settled":
  // its outer frame stops carrying a transition on its own size, so that
  // opening/closing a category's value list afterward (which changes how
  // much room the drawer needs) simply resizes to fit rather than replaying
  // the whole slow reveal. Without this, grid-template-rows continues to
  // animate on every internal size change even though its own specified
  // value ("1fr") never changes -- which is exactly what made the header
  // look like it was "re-expanding" every time a category was opened.
  const [isSettled, setIsSettled] = useState(false);
  // Which single category (theme/project/year) currently has its value
  // panel open beneath the row. Only one at a time, so the drawer stays
  // quiet and only ever adds one extra accordion step.
  const [activeEntry, setActiveEntry] = useState(null);
  // Each category now holds an array -- every field is multi-select.
  // Selecting a value appends it; it stays selected until individually
  // removed (via its own hover-revealed x), not replaced by the next pick.
  const [selection, setSelection] = useState({
    theme: [],
    project: [],
    year: [],
  });
  const drawerRef = useRef(null);
  // One DOM node per Context field, collected as they render, so the
  // Active Panel can measure where the currently selected Context sits
  // without the Context row itself needing to know anything about it.
  const fieldRefs = useRef(new Map());
  // How far the Active Panel's reading origin sits from the row's own
  // left edge -- i.e. where the active Context's own label begins.
  const [activeOffset, setActiveOffset] = useState(0);
  // Whether the Active Panel is showing the active Context's full value
  // list rather than just its curated preview. Reset whenever the active
  // Context changes (see handleAddClick) -- the preview is always where a
  // freshly opened, or reopened, Context starts.
  const [isExpanded, setIsExpanded] = useState(false);

  const entryValues = { theme: themes, project: projects, year: years };
  const entryLabels = { theme: "Theme", project: "Project", year: "Year" };
  const activeFilterCount = Object.values(selection).reduce(
    (sum, values) => sum + values.length,
    0
  );
  const activeValues = activeEntry ? entryValues[activeEntry] : [];
  const previewValues = activeEntry ? getPreviewValues(activeValues) : [];
  // Only meaningful once a Context is active, and only once its full list
  // is actually longer than its own preview -- a category with fewer
  // values than the preview threshold has nothing left to reveal, so no
  // View All control should appear for it at all.
  const visibleValues = isExpanded ? activeValues : previewValues;
  const hasHiddenValues = !isExpanded && activeValues.length > previewValues.length;

  const setFilterOpen = (nextOpen) => {
    setIsFilterOpen(nextOpen);
    onFilterOpenChange?.(nextOpen);

    if (!nextOpen) {
      setActiveEntry(null);
    }
  };

  const handleFilterToggle = () => {
    setFilterOpen(!isFilterOpen);
  };

  // The "+" is the only click target that opens a category's value list --
  // the label itself is just archival text now, not a control. Clicking it
  // again (while its own list is already open) closes that list, same
  // one-at-a-time accordion behavior as before. Switching -- or closing
  // and reopening -- always resets the panel back to its curated preview,
  // so "expanded" is never a state a Context silently reopens into.
  const handleAddClick = (key) => {
    setActiveEntry((current) => (current === key ? null : key));
    setIsExpanded(false);
  };

  // Expands the existing Active Panel to its Context's complete value
  // list. Not a new panel or navigation level -- the same reading surface
  // simply grows to hold more of the same kind of content.
  const handleViewAllClick = () => {
    setIsExpanded(true);
  };

  // Clicking a value in the list toggles its membership in that category's
  // selection -- it does not replace the existing picks, and it does not
  // close the list, so several values can be added in one pass before the
  // user dismisses it themselves.
  const handleOptionToggle = (key, value) => {
    setSelection((current) => {
      const existing = current[key];
      const nextValues = existing.includes(value)
        ? existing.filter((entry) => entry !== value)
        : [...existing, value];
      const next = { ...current, [key]: nextValues };
      onFilterChange?.(next);
      return next;
    });
  };

  // Arms the "settled" state once the slow expansion has had time to
  // finish -- 1500ms comfortably clears the drawer's own 1400ms reveal.
  // Closing resets it immediately, so the next open cycle always replays
  // the full slow reveal from a clean state.
  useEffect(() => {
    if (!isFilterOpen) {
      setIsSettled(false);
      return undefined;
    }

    const timer = setTimeout(() => setIsSettled(true), 1500);
    return () => clearTimeout(timer);
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (activeEntry) {
        setActiveEntry(null);
      } else {
        setFilterOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFilterOpen, activeEntry]);

  // The Context row never moves -- THEME/PROJECT/YEAR stay exactly where
  // they are. Instead, the single Active Panel shifts its own reading
  // origin to sit beneath whichever Context is active, measured from the
  // real rendered position of that Context's own label. useLayoutEffect
  // (not useEffect) so this resolves before the browser paints -- even
  // the very first time a Context other than the leftmost one is opened,
  // the panel appears already aligned rather than flashing at the left
  // edge for a frame. Re-measures on resize since the whole layout is
  // fluid (clamp()-based), so a label's position can shift without
  // activeEntry itself changing.
  useLayoutEffect(() => {
    if (!activeEntry) return undefined;

    const updateOffset = () => {
      const node = fieldRefs.current.get(activeEntry);
      if (!node) return;
      setActiveOffset(node.offsetLeft);
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [activeEntry]);

  // Reports the drawer's own live rendered height (0 when closed, and
  // updating continuously as the grid-template-rows animation opens/closes)
  // so the archive below can lower by exactly that amount instead of the
  // header simply overlaying it.
  useEffect(() => {
    const node = drawerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      onDrawerHeightChange?.(entry.contentRect.height);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [onDrawerHeightChange]);

  return (
    <header
      className={`site-header${isFilterOpen ? " site-header--framed" : ""}`}
    >
      <div className="site-header__row1">
        <img className="brand" src="/urbanum-logo.jpg" alt="urbānum" />
        <nav className="top-menu" aria-label="Gallery navigation">
          <div className="top-menu__group" aria-label="Browse tools">
            <button
              type="button"
              className={`text-control text-control--active text-control--filter${
                isFilterOpen ? " text-control--engaged" : ""
              }`}
              aria-expanded={isFilterOpen}
              onClick={handleFilterToggle}
            >
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <>
                  <span className="index-drawer__label-separator">·</span>
                  <span className="filter-count">{activeFilterCount}</span>
                </>
              )}
            </button>

            <div className="nav-divider"></div>

            <button type="button" className="text-control text-control--muted">
              Search
            </button>
          </div>
          <button type="button" className="text-control text-control--active">
            Index
          </button>
        </nav>
      </div>

      {/* The index drawer: another sheet of the archive's own catalog
          unfolding beneath the header, not a floating menu. Its own
          rendered height (measured above) is what pushes the archive down. */}
      <div
        ref={drawerRef}
        className={`index-drawer${isFilterOpen ? " is-open" : ""}${
          isSettled ? " is-settled" : ""
        }`}
        aria-hidden={!isFilterOpen}
      >
        <div className="index-drawer__inner">
          <div className="index-drawer__row">
            {/* Level 2 -- the Context row. Theme/Project/Year are pure
                selectors now: clicking one only ever changes which context
                is active. None of them render their own value list here
                anymore -- that's the single Active Panel below. */}
            {INDEX_ENTRIES.map(({ key, label }) => {
              const values = selection[key];
              const isEntryOpen = activeEntry === key;

              return (
                <div
                  className="index-drawer__field"
                  key={key}
                  ref={(el) => {
                    if (el) fieldRefs.current.set(key, el);
                  }}
                >
                  <div className="index-drawer__field-row">
                    {/* The label itself is now an equally valid click
                        target for opening/closing this category's value
                        list -- same handler, same accordion behavior, as
                        the "+" beside it. Selected values themselves are no
                        longer shown here -- only a count of how many are
                        selected. The values themselves now live solely in
                        the Active Content Panel below, which is the one
                        place they're displayed and managed. */}
                    <button
                      type="button"
                      className="index-drawer__label-text"
                      aria-expanded={isEntryOpen}
                      onClick={() => handleAddClick(key)}
                      tabIndex={isFilterOpen ? 0 : -1}
                    >
                      {label}
                      {values.length > 0 && (
                        <span className="index-drawer__count">
                          ({values.length})
                        </span>
                      )}
                    </button>

                    {/* Purely archival at rest -- no icon, no visible
                        affordance. The "+" only ever appears while this
                        field (its label or its count) is hovered or
                        focused, then quietly fades away again. */}
                    <button
                      type="button"
                      className="index-drawer__add"
                      aria-label={`${label} filter options`}
                      aria-expanded={isEntryOpen}
                      onClick={() => handleAddClick(key)}
                      tabIndex={isFilterOpen ? 0 : -1}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Level 3 -- the single Active Panel. There is exactly one of
              these, not one per category: Theme/Project/Year do not each
              own their own dropdown -- they just tell this shared panel
              what to display. Its open state is "is any context active",
              and its content is whichever context's values that is.
              The Context row above never moves -- instead this panel's own
              reading origin (marginLeft) shifts to sit beneath whichever
              Context is active, using the offset measured by the
              useLayoutEffect above. width is reduced by that same offset
              so the panel's right edge stays anchored to the drawer's own
              right boundary instead of overflowing past it, which keeps
              the horizontal wrapping behavior correct at every offset. */}
          <div
            className={`index-drawer__panel${activeEntry ? " is-open" : ""}`}
            aria-hidden={!activeEntry}
            style={{
              marginLeft: activeOffset,
              width: `calc(100% - ${activeOffset}px)`,
            }}
          >
            <div className="index-drawer__panel-inner">
              <div
                className={`index-drawer__options-list${
                  activeEntry ? " is-visible" : ""
                }`}
              >
                {activeEntry &&
                  visibleValues.map((option) => {
                    const isSelected = selection[activeEntry].includes(option);
                    return (
                      <button
                        type="button"
                        key={option}
                        className={`index-drawer__option${
                          isSelected ? " index-drawer__option--selected" : ""
                        }`}
                        aria-pressed={isSelected}
                        onClick={() => handleOptionToggle(activeEntry, option)}
                        tabIndex={isFilterOpen ? 0 : -1}
                      >
                        {/* Selected values read as indexed archive
                            references -- bracketed text, not chips. The ×
                            is a purely visual editing affordance (hidden
                            via aria-hidden, since aria-pressed above
                            already carries the selected state to assistive
                            tech): it stays invisible and reserves no space
                            at rest, and only grows in on hover/focus. The
                            same click/Enter/Space that already toggles
                            this option off is what removes it -- there's
                            no separate remove control to activate. */}
                        {isSelected ? (
                          <>
                            <span
                              className="index-drawer__option-bracket"
                              aria-hidden="true"
                            >
                              [
                            </span>
                            <span className="index-drawer__option-text">
                              {option}
                            </span>
                            <span
                              className="index-drawer__option-remove"
                              aria-hidden="true"
                            >
                              ×
                            </span>
                            <span
                              className="index-drawer__option-bracket"
                              aria-hidden="true"
                            >
                              ]
                            </span>
                          </>
                        ) : (
                          option
                        )}
                      </button>
                    );
                  })}

                {/* Appears only once there's more of the Context's index
                    left to reveal. Deliberately plain -- no distinct
                    control styling -- so it reads as another archive term
                    whose purpose happens to be expanding this same reading
                    surface, not as a link navigating somewhere new. */}
                {hasHiddenValues && (
                  <button
                    type="button"
                    className="index-drawer__option"
                    aria-label={`View all ${entryLabels[
                      activeEntry
                    ]?.toLowerCase()} options`}
                    onClick={handleViewAllClick}
                    tabIndex={isFilterOpen ? 0 : -1}
                  >
                    View All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
