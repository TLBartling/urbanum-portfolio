import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Logo from "./Logo";
import {
  navigate,
  navigateHomeWithIntent,
  consumePendingHomeIntent,
  useCurrentPath,
} from "./navigation";

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

// Menu is the same drawer showing different content: no categories or
// selection state, just a small set of top-level destinations.
const MENU_LINKS = ["About", "Journal"];

// Both links are now wired up to real routes; kept as a lookup rather
// than growing the ternary below, since a third page later is one more
// entry here instead of a longer condition.
const MENU_LINK_PATHS = {
  About: "/about",
  Journal: "/journal",
};

// Contact is revealed through the exact same active-field/panel mechanism
// as Filter's Theme/Project/Year (see entryValues/entryLabels and the
// shared Active Panel below) -- it's just another entry, "contact", in
// that same lookup. Adding a fourth contact method later is a one-line
// change here; no interaction code needs to change.
const MENU_CONTACT_ITEMS = ["Instagram", "Email", "Phone"];

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
  // Computed first (rather than down where it originally lived, alongside
  // isChildPageScrolled) because the initial state below now depends on it:
  // Menu defaults open on every child page -- the homepage's own Menu
  // behavior is untouched. Header remounts fresh on every route change (each
  // page mounts its own <Header>), so "defaults" here really does mean "the
  // state this particular mount starts in," not a value that needs to be
  // reset later.
  const path = useCurrentPath();
  const isChildPage = path !== "/";

  // Consumed exactly once, on this mount: which control (if any) asked to
  // resume on the homepage after a Filter/Search return trip from a child
  // page. See navigateHomeWithIntent/consumePendingHomeIntent in
  // navigation.js. null on every ordinary visit (including a plain click on
  // the logo), so this only ever affects the specific arrival it's meant to.
  const [pendingIntent] = useState(() => consumePendingHomeIntent());

  // Filter and Menu physically share one drawer surface -- only one of
  // their two content rows can occupy .index-drawer at a time -- so
  // they're modeled as one exclusive selector. Search is deliberately NOT
  // part of this: Filter and Search are complementary tools a visitor can
  // reasonably use together, so it keeps its own independent open state
  // below. Menu still closes Search on open (see handleMenuToggle) since
  // Menu is navigation that temporarily replaces the working interface,
  // not another working tool alongside it.
  //
  // Initial value covers three cases: a child page always starts with Menu
  // open (the design intent -- it's the site's table of contents while
  // reading); the homepage starts with Filter open only if this mount is the
  // arrival half of a Filter return trip; otherwise closed, exactly as
  // before.
  const [drawerSection, setDrawerSection] = useState(() => {
    if (isChildPage) return "menu";
    if (pendingIntent?.type === "filter") return "filter";
    return null;
  });
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
  // Which selected option's × is currently allowed to show. Set only by a
  // mouseenter/focus that lands on an option that is *already* selected --
  // never by the click that does the selecting, since the pointer is still
  // over the option at that instant and would otherwise satisfy a plain
  // :hover selector immediately, flashing the × as part of selection
  // itself rather than a later, deliberate return visit.
  const [removeArmedValue, setRemoveArmedValue] = useState(null);
  // The search query itself. Still purely local -- nothing executes a
  // search yet -- so a future search implementation has one clean place to
  // hook into rather than re-deriving where the typed value lives. The one
  // exception: arriving here as a Search return trip's homepage half
  // restores the text the visitor already typed on the child page, so the
  // field reads as continuous rather than reset.
  const [searchValue, setSearchValue] = useState(() =>
    pendingIntent?.type === "search" ? pendingIntent.query : ""
  );
  // Whether the search line is drawn out. Independent of drawerSection on
  // purpose (see the note above) -- Filter and Search can be open at the
  // same time. Clicking SEARCH toggles this directly (same as Filter's own
  // toggle); losing focus with an empty field also closes it, but only
  // that specific case -- typed text keeps it open until the visitor
  // closes it themselves. Also starts open on a Search return trip's
  // homepage arrival, so the restored text is visible rather than hidden
  // behind a closed line.
  const [isSearchOpen, setIsSearchOpen] = useState(
    () => pendingIntent?.type === "search"
  );
  const searchInputRef = useRef(null);

  // Derived read-only flags over drawerSection.
  const isFilterOpen = drawerSection === "filter";
  const isMenuOpen = drawerSection === "menu";
  // Whether the header has unfolded its subheader (category row or menu
  // row) at all -- Filter and Menu both use this same drawer/frame. Search
  // has its own separate, lighter-weight reveal (the input line itself)
  // and isn't part of this shared surface.
  const isDrawerOpen = isFilterOpen || isMenuOpen;

  // On any page other than the homepage, the header should also solidify
  // as soon as the visitor scrolls -- the transparent-over-hero treatment
  // only makes sense above the gallery. This reuses the exact same
  // .site-header--framed surface the drawer already opens into (same
  // background, shadow, and reveal-ease timing), so there's nothing new
  // to look at here, just another condition that can ask for it. The
  // listener itself is only attached on child pages, so the homepage's
  // header is untouched by this in every way. (path/isChildPage themselves
  // now live at the top of the component -- see there -- since the initial
  // drawerSection state above needs isChildPage before this point.)
  const [isChildPageScrolled, setIsChildPageScrolled] = useState(false);

  useEffect(() => {
    if (!isChildPage) {
      setIsChildPageScrolled(false);
      return undefined;
    }

    const handleScroll = () => setIsChildPageScrolled(window.scrollY > 4);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isChildPage]);

  // Drives the brief full-viewport veil (rendered at the bottom of this
  // component) that masks a child page's return trip to the homepage for
  // Filter or Search, so it reads as quietly arriving back at the archive
  // rather than an abrupt swap between two independently rendered pages.
  // isLeaving fades the veil in on the child page, right before navigating;
  // isArriving starts it already opaque on the homepage and fades it back
  // out right after mounting -- same duration, same easing, two halves of
  // one motion. Neither state is ever true outside this specific flow (a
  // plain click on the logo, for instance, never touches either).
  const [isLeaving, setIsLeaving] = useState(false);
  const [isArriving, setIsArriving] = useState(() => pendingIntent !== null);
  const leaveTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isArriving) return undefined;
    // Committing the opaque state on mount, then flipping it back on the
    // next frame, is what makes this transition rather than start already
    // resolved -- without a frame in between, the browser has nothing to
    // interpolate from.
    const frame = requestAnimationFrame(() => setIsArriving(false));
    return () => cancelAnimationFrame(frame);
  }, [isArriving]);

  // Matches the header's own framing transition (520ms, var(--reveal-ease))
  // so this reads as part of the site's existing motion vocabulary rather
  // than a new one.
  const VEIL_DURATION_MS = 520;

  // Shared by Filter and Search: both resolve on the homepage now, so
  // returning there is one motion regardless of which control asked for it
  // -- only the intent carried across differs.
  const beginGentleReturnHome = (intent) => {
    setIsLeaving(true);
    leaveTimeoutRef.current = window.setTimeout(() => {
      navigateHomeWithIntent(intent);
    }, VEIL_DURATION_MS);
  };

  const entryValues = {
    theme: themes,
    project: projects,
    year: years,
    contact: MENU_CONTACT_ITEMS,
  };
  const entryLabels = {
    theme: "Theme",
    project: "Project",
    year: "Year",
    contact: "Contact",
  };
  const activeValues = activeEntry ? entryValues[activeEntry] : [];
  const previewValues = activeEntry ? getPreviewValues(activeValues) : [];
  // Only meaningful once a Context is active, and only once its full list
  // is actually longer than its own preview -- a category with fewer
  // values than the preview threshold has nothing left to reveal, so no
  // View All control should appear for it at all.
  const visibleValues = isExpanded ? activeValues : previewValues;
  const hasHiddenValues = !isExpanded && activeValues.length > previewValues.length;

  // onFilterOpenChange is specifically about Filter's own open state, so it
  // only fires when Filter itself transitions -- an explicit toggle, or
  // Menu taking over the shared drawer. Search no longer forces Filter
  // closed, so it no longer calls this at all.
  const notifyIfFilterCloses = (nextSection) => {
    if (isFilterOpen && nextSection !== "filter") {
      onFilterOpenChange?.(false);
    }
  };

  // On a child page, Filter is archive filtering -- and the archive is the
  // homepage -- so it no longer opens a drawer here at all. It quietly
  // returns to the homepage instead, arriving with the existing Filter
  // drawer already open (see the drawerSection initializer above).
  const handleFilterToggle = () => {
    if (isChildPage) {
      beginGentleReturnHome({ type: "filter" });
      return;
    }
    const nextOpen = !isFilterOpen;
    setDrawerSection(nextOpen ? "filter" : null);
    onFilterOpenChange?.(nextOpen);
  };

  // Search is fully independent of Filter now -- opening or closing it
  // never touches drawerSection, so Filter stays exactly as it was. The
  // one exception is Menu: since Menu temporarily replaces the working
  // interface, bringing Search up (like opening Filter) steps back out of
  // Menu the same way. Closing this way always retracts the line (even
  // with text typed in) using the identical reveal transition in reverse,
  // since it's the same width/margin transition on .search-control__input
  // either way -- just driven by this state instead of the field's own
  // focus. The button's onMouseDown below stops the input from blurring
  // itself first when the field is open and empty -- without that, the
  // blur's own auto-close (see the input's onBlur) would fire before this
  // click and then get reopened by the toggle right after, which is what
  // made an empty field look like clicking SEARCH did nothing.
  const handleSearchToggle = () => {
    const nextOpen = !isSearchOpen;
    setIsSearchOpen(nextOpen);
    if (nextOpen) {
      setDrawerSection((current) => (current === "menu" ? null : current));
      searchInputRef.current?.focus();
    } else {
      searchInputRef.current?.blur();
    }
  };

  // On a child page, submitting a search is archive search -- and the
  // archive is the homepage -- so Enter here doesn't try to search the
  // child page itself. It quietly returns to the homepage carrying the
  // typed text, which arrives already restored into this same field (see
  // the searchValue/isSearchOpen initializers above). No search actually
  // runs yet on the homepage either -- there's no gallery search behavior
  // to hand this off to today -- so this only ever adapts the navigation
  // flow, exactly as scoped. On the homepage itself this is a no-op, same
  // as before this change.
  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter" || !isChildPage) return;
    beginGentleReturnHome({ type: "search", query: searchValue });
  };

  // Menu is the one section that still fully takes over: opening it closes
  // both Filter and Search, since Menu is navigation replacing the working
  // interface rather than another working tool alongside it. Clicking Menu
  // again just collapses it, same as Filter's own toggle.
  const handleMenuToggle = () => {
    const nextOpen = !isMenuOpen;
    notifyIfFilterCloses(nextOpen ? "menu" : null);
    setDrawerSection(nextOpen ? "menu" : null);
    if (nextOpen) {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
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
  // the full slow reveal from a clean state. Keyed on isDrawerOpen (not
  // just isFilterOpen) so Menu's use of the same drawer gets the same
  // settle behavior.
  useEffect(() => {
    if (!isDrawerOpen) {
      setIsSettled(false);
      return undefined;
    }

    const timer = setTimeout(() => setIsSettled(true), 1500);
    return () => clearTimeout(timer);
  }, [isDrawerOpen]);

  // The active field panel (Theme/Project/Year under Filter, or Contact
  // under Menu) only ever belongs to whichever section currently owns the
  // shared drawer. Keying this cleanup on drawerSection itself -- rather
  // than isFilterOpen alone -- guarantees a clean slate any time that
  // ownership changes: Filter closing, Menu closing, or switching directly
  // from one to the other. It does NOT fire on every click within a
  // section (e.g. Theme -> Project, or opening Contact), since
  // drawerSection itself doesn't change there -- only handleAddClick does.
  useEffect(() => {
    setActiveEntry(null);
  }, [drawerSection]);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (isFilterOpen && activeEntry) {
        setActiveEntry(null);
        return;
      }

      notifyIfFilterCloses(null);
      setDrawerSection(null);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, isFilterOpen, activeEntry]);

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
      className={`site-header${
        isDrawerOpen || (isChildPage && isChildPageScrolled)
          ? " site-header--framed"
          : ""
      }`}
    >
      <div className="site-header__row1">
        <button
          type="button"
          className="brand-button"
          onClick={() => navigate("/")}
          aria-label="Urbānum — home"
        >
          <Logo className="brand" />
        </button>
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
            </button>

            <div className="nav-divider"></div>

            <div className="search-control">
              <button
                type="button"
                className="text-control text-control--muted"
                aria-expanded={isSearchOpen}
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleSearchToggle}
              >
                Search
              </button>
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search"
                className={`search-control__input${
                  isSearchOpen ? " is-open" : ""
                }`}
                autoComplete="off"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setDrawerSection((current) =>
                    current === "menu" ? null : current
                  );
                }}
                onBlur={() => {
                  if (!searchValue) {
                    setIsSearchOpen(false);
                  }
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className={`text-control text-control--active text-control--filter${
              isMenuOpen ? " text-control--engaged" : ""
            }`}
            aria-expanded={isMenuOpen}
            onClick={handleMenuToggle}
          >
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {/* The index drawer: another sheet of the archive's own catalog
          unfolding beneath the header, not a floating menu. Its own
          rendered height (measured above) is what pushes the archive down. */}
      <div
        ref={drawerRef}
        className={`index-drawer${isDrawerOpen ? " is-open" : ""}${
          isSettled ? " is-settled" : ""
        }`}
        aria-hidden={!isDrawerOpen}
      >
        <div className="index-drawer__inner">
          {isMenuOpen ? (
            /* Menu displaying inside the exact same drawer surface Filter
               uses -- same wrapper, same is-open/is-settled classes, same
               reveal/stagger CSS -- just a different content row. Contact
               is the one interactive field here, and it reuses the
               identical field/label/handleAddClick pattern
               Theme/Project/Year use below -- see the shared Active Panel
               further down for its reveal. */
            <div className="index-drawer__row index-drawer__row--menu">
              {MENU_LINKS.map((label) => (
                <div className="index-drawer__field" key={label}>
                  <div className="index-drawer__field-row">
                    <button
                      type="button"
                      className="index-drawer__label-text"
                      onClick={() => navigate(MENU_LINK_PATHS[label])}
                      tabIndex={isMenuOpen ? 0 : -1}
                    >
                      {label}
                    </button>
                  </div>
                </div>
              ))}
              <div
                className="index-drawer__field"
                ref={(el) => {
                  if (el) fieldRefs.current.set("contact", el);
                }}
              >
                <div className="index-drawer__field-row">
                  <button
                    type="button"
                    className="index-drawer__label-text"
                    aria-expanded={activeEntry === "contact"}
                    onClick={() => handleAddClick("contact")}
                    tabIndex={isMenuOpen ? 0 : -1}
                  >
                    Contact
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
          )}

          {/* Level 3 -- the single Active Panel, shared by Filter's
              Theme/Project/Year AND Menu's Contact -- there is exactly one
              of these, not one per field or per section: each field just
              tells this shared panel what to display. Its open state is
              "is any field active", and its content is whichever field's
              values that is (see entryValues/entryLabels above, which now
              include "contact" alongside theme/project/year). The field
              row above never moves -- instead this panel's own reading
              origin (marginLeft) shifts to sit beneath whichever field is
              active, using the offset measured by the useLayoutEffect
              above. width is reduced by that same offset so the panel's
              right edge stays anchored to the drawer's own right boundary
              instead of overflowing past it, which keeps the horizontal
              wrapping behavior correct at every offset. */}
          <div
            className={`index-drawer__panel${activeEntry ? " is-open" : ""}`}
            aria-hidden={!activeEntry}
            style={
              activeEntry === "contact"
                ? /* Contact's field sits at the right end of a
                     right-aligned row (index-drawer__row--menu), so it's
                     already close to the row's right edge -- narrowing the
                     panel by that same offset (the way Filter's left-
                     aligned Theme/Project/Year do) would leave almost no
                     room and wrap "Instagram Email Phone" onto separate
                     lines. Same alignment philosophy as the row above it,
                     mirrored for a right-aligned field: full width, right
                     -justified content (see index-drawer__options-list--menu
                     below), instead of a left-anchored, width-reduced panel. */
                  { marginLeft: 0, width: "100%" }
                : {
                    marginLeft: activeOffset,
                    width: `calc(100% - ${activeOffset}px)`,
                  }
            }
          >
            <div className="index-drawer__panel-inner">
              <div
                className={`index-drawer__options-list${
                  activeEntry ? " is-visible" : ""
                }${
                  activeEntry === "contact"
                    ? " index-drawer__options-list--menu"
                    : ""
                }`}
              >
                {activeEntry === "contact"
                  ? /* Contact has no selection state -- it's a plain,
                       static reading of the same options list, typographic
                       like everything else in the header rather than
                       icons. index-drawer__option--static just neutralizes
                       the selectable-chip's hover/cursor affordance. */
                    visibleValues.map((option) => (
                      <span
                        className="index-drawer__option index-drawer__option--static"
                        key={option}
                      >
                        {option}
                      </span>
                    ))
                  : activeEntry &&
                    visibleValues.map((option) => {
                      const isSelected =
                        selection[activeEntry].includes(option);
                      const armRemove = () => {
                        if (isSelected) setRemoveArmedValue(option);
                      };
                      const disarmRemove = () =>
                        setRemoveArmedValue((current) =>
                          current === option ? null : current
                        );
                      return (
                        <button
                          type="button"
                          key={option}
                          className={`index-drawer__option${
                            isSelected ? " index-drawer__option--selected" : ""
                          }${
                            removeArmedValue === option
                              ? " index-drawer__option--remove-armed"
                              : ""
                          }`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            // A click that's about to *select* this option
                            // always starts clean, even if it was armed from
                            // a previous selected/hovered visit that ended
                            // in removal without the pointer ever leaving --
                            // otherwise reselecting it in the same hover
                            // session would show the × immediately, which is
                            // exactly the "flash during selection" this is
                            // meant to avoid.
                            if (!isSelected) setRemoveArmedValue(null);
                            handleOptionToggle(activeEntry, option);
                          }}
                          onMouseEnter={armRemove}
                          onMouseLeave={disarmRemove}
                          onFocus={armRemove}
                          onBlur={disarmRemove}
                          tabIndex={isDrawerOpen ? 0 : -1}
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
                    tabIndex={isDrawerOpen ? 0 : -1}
                  >
                    View All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Filter/Search return-to-homepage veil (see isLeaving/isArriving
          above). Rendered unconditionally, at rest it's fully transparent
          and non-interactive -- .is-opaque is what the transition actually
          drives. Kept mounted at all times rather than conditionally, so
          the opacity change itself is always a real CSS transition, never a
          mount that has nothing to animate from. */}
      <div
        className={`page-transition-veil${
          isLeaving || isArriving ? " is-opaque" : ""
        }`}
        aria-hidden="true"
      />
    </header>
  );
}
