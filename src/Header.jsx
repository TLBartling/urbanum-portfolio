import { useEffect, useRef, useState } from "react";

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

  const entryValues = { theme: themes, project: projects, year: years };
  const activeFilterCount = Object.values(selection).reduce(
    (sum, values) => sum + values.length,
    0
  );

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
  // one-at-a-time accordion behavior as before.
  const handleAddClick = (key) => {
    setActiveEntry((current) => (current === key ? null : key));
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

  // Removing one selected chip only ever touches that single value --
  // every other selection, in every category, is left untouched.
  const handleChipRemove = (key, value, event) => {
    event.stopPropagation();
    setSelection((current) => {
      const next = {
        ...current,
        [key]: current[key].filter((entry) => entry !== value),
      };
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
            {INDEX_ENTRIES.map(({ key, label }) => {
              const values = selection[key];
              const isEntryOpen = activeEntry === key;

              return (
                <div className="index-drawer__field" key={key}>
                  <div className="index-drawer__field-row">
                    <span className="index-drawer__label-text">{label}</span>

                    {/* Purely archival at rest -- no icon, no visible
                        affordance. The "+" only ever appears while this
                        field (its label or its existing chips) is
                        hovered or focused, then quietly fades away again. */}
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

                    {values.length > 0 && (
                      <div className="index-drawer__chips">
                        {values.map((value) => (
                          <span className="index-drawer__chip" key={value}>
                            <span className="index-drawer__chip-bracket">
                              [
                            </span>
                            <span className="index-drawer__chip-text">
                              {value}
                            </span>
                            <button
                              type="button"
                              className="index-drawer__chip-remove"
                              aria-label={`Remove ${value} from ${label.toLowerCase()}`}
                              onClick={(event) =>
                                handleChipRemove(key, value, event)
                              }
                              tabIndex={isFilterOpen ? 0 : -1}
                            >
                              ×
                            </button>
                            <span className="index-drawer__chip-bracket">
                              ]
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nested directly beneath this field's own label, so its
                      left edge aligns with that label rather than with the
                      start of the whole row -- each category is its own
                      independent column, not a shared strip. */}
                  <div
                    className={`index-drawer__panel${
                      isEntryOpen ? " is-open" : ""
                    }`}
                    aria-hidden={!isEntryOpen}
                  >
                    <div className="index-drawer__panel-inner">
                      <div
                        className={`index-drawer__options-list${
                          isEntryOpen ? " is-visible" : ""
                        }`}
                      >
                        {isEntryOpen &&
                          entryValues[key].map((option) => {
                            const isSelected = values.includes(option);
                            return (
                              <button
                                type="button"
                                key={option}
                                className={`index-drawer__option${
                                  isSelected
                                    ? " index-drawer__option--selected"
                                    : ""
                                }`}
                                aria-pressed={isSelected}
                                onClick={() => handleOptionToggle(key, option)}
                                tabIndex={isFilterOpen && isEntryOpen ? 0 : -1}
                              >
                                {option}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
