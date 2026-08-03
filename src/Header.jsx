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

// Filter UX -- Clear All: the one shape "no active filters" means,
// reused as both selection's own initial state and the value
// handleFilterClearAll resets straight back to -- so there is exactly one
// place that defines what "cleared" looks like, not two literals that
// could drift apart later (e.g. if a real Tag category is added).
const EMPTY_FILTER_SELECTION = { theme: [], tag: [], project: [], year: [] };

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
  onLogoClick,
  // Search Query Wiring: Header still owns the Search UI entirely (typing,
  // when to open/close the input line, the collapsed chip below) and knows
  // nothing about ARCHIVE_ITEMS/queryArchive/gallery regeneration -- it
  // only ever calls these two with the plain committed query string (submit)
  // or with nothing at all (clear). App.jsx is the only thing that actually
  // knows what those mean.
  onSearchSubmit,
  onSearchClear,
  // Filter UX refinement (Metadata Filter Sync): a one-shot "please
  // toggle this Theme value into your own selection" request from
  // App.jsx, sent only when a Theme is clicked from HoverOverlay while
  // Filter mode is already active there (see App.jsx's
  // handleMetadataFilterCommit/isFilterModeActive). null the rest of the
  // time. See the effect below, the one place this is consumed, for the
  // full reasoning.
  pendingThemeFilterCommit,
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
  //
  // Filter Query State (state management only -- no gallery/queryArchive
  // wiring yet): this is also the active filter query itself, shaped to
  // match the Metadata Query Engine's query object exactly -- theme/tag/
  // project/year, every field an array so a later commit's OR-within-field
  // behavior (queryArchive's own contract -- see metadataQueryEngine.js)
  // works the moment it's wired up, without this shape needing to change.
  // `tag` is included for that same reason even though nothing in this
  // Filter UI can populate it yet (there is no Tag category here today --
  // see INDEX_ENTRIES below); it simply always stays []. Every update still
  // flows to App.jsx via onFilterChange (see handleOptionToggle below),
  // exactly as it already did -- what's new is only that App.jsx now
  // actually keeps what it's handed (see activeFilterQuery in App()),
  // rather than that prop going unused. Search stays entirely separate
  // state (committedSearch, owned by this same component) -- this commit
  // does not touch it and does not combine the two.
  const [selection, setSelection] = useState(EMPTY_FILTER_SELECTION);
  // Filter UX -- Clear All: mirrors removeArmedValue's own arm/disarm
  // pattern below, just scoped to this one control instead of a per-value
  // lookup, since there's only ever one Clear All control. Armed by
  // hovering (or focusing) the shared Filter control -- the same
  // hover-reveal language Search's own chip and Filter's per-value chips
  // already use -- and reveals the x that clears every active filter.
  const [isFilterClearArmed, setIsFilterClearArmed] = useState(false);
  // Filter UX consistency pass -- Category Clear: which single Theme/
  // Project/Year row (if any) currently has its own x armed. Same
  // "one armed identifier at a time" shape as removeArmedValue below
  // (the per-value chip equivalent), not a lookup of three separate
  // booleans -- there are three rows here, but still only ever one
  // hovered/focused at a time, so one piece of state covers all three.
  const [categoryClearArmed, setCategoryClearArmed] = useState(null);
  // Layout Bug Fix -- Gallery Shift on Filter Open (Camera-based revision):
  // measures the drawer's own live rendered height so App.jsx's Camera
  // system can compute exactly how much viewport scale reduction it
  // currently needs -- see the ResizeObserver effect and onDrawerHeightChange
  // below. This ref exists purely to be observed; nothing here reads its
  // node for any other purpose.
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
  // Search Query Wiring: null until the homepage's own Enter-to-commit
  // (see handleSearchKeyDown) sets it -- the one flag that decides whether
  // the input line or the compact chip renders below. Deliberately starts
  // null even on a Search return-trip arrival (pendingIntent.type ===
  // "search"): that arrival restores the *typed* text into the still-open
  // field, same as before this commit, not an already-committed query --
  // committing on the homepage is still a fresh Enter press, same as
  // typing it fresh. Purely local UI state; the actual query string this
  // holds is never read by anything outside this component -- App.jsx
  // only ever receives it once, as onSearchSubmit's argument.
  const [committedSearch, setCommittedSearch] = useState(null);
  // Mirrors Filter's own removeArmedValue (see its comment above), just
  // scoped to a single boolean since Search only ever has one committed
  // value at a time rather than a multi-select list. Same purpose: only
  // ever set true by a deliberate mouseenter/focus, so the chip's x grows
  // in the identical way Filter's own selected-option x does -- this is a
  // pure visual reuse of that same reveal mechanism, not shared state.
  const [isSearchChipRemoveArmed, setIsSearchChipRemoveArmed] =
    useState(false);

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
  // Filter UX -- Clear All: total selections across every category,
  // tag included (future-safe, even though nothing can populate it yet --
  // see selection's own comment above). This is the closed Filter
  // control's own count, entirely separate from the per-category (n)
  // shown inside the open drawer next to Theme/Project/Year (values[key]
  // above) -- that per-category count is untouched by this commit.
  const totalFilterCount =
    selection.theme.length +
    selection.tag.length +
    selection.project.length +
    selection.year.length;

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
  // the searchValue/isSearchOpen initializers above) -- unchanged by this
  // commit, still not itself committed as a search (see committedSearch's
  // own comment above); wiring that return-trip straight into a committed
  // search on arrival is a separate concern this commit doesn't touch.
  //
  // Search Query Wiring: on the homepage itself, Enter now does something
  // for the first time -- a non-empty typed value commits (closing the
  // input line and swapping in the chip below) and is handed to
  // onSearchSubmit, which is the only thing that knows how to turn it into
  // gallery results. An empty field is a no-op either way, same as before.
  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;

    if (isChildPage) {
      beginGentleReturnHome({ type: "search", query: searchValue });
      return;
    }

    const query = searchValue.trim();
    if (!query) return;

    setCommittedSearch(query);
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
    onSearchSubmit?.(query);
  };

  // Clicking the chip (its bracketed text or its x -- one click target,
  // same as Filter's own selected options): clears the committed query,
  // collapses the chip back into the plain closed "Search" state (empty
  // field, same as a fresh visit), and hands off to onSearchClear so
  // Gallery can return to the full Archive dataset.
  const handleSearchClear = () => {
    setCommittedSearch(null);
    setSearchValue("");
    setIsSearchChipRemoveArmed(false);
    onSearchClear?.();
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
      // Filter UX refinement (Drawer Auto-Collapse): once the last
      // selection in this category is removed, there is nothing left for
      // this category's drawer to show -- collapse it automatically
      // rather than leaving an empty panel open. Reuses the existing
      // activeEntry state (the same state that already tracks which
      // category's panel is open) rather than introducing a parallel
      // "is this category empty" flag.
      if (nextValues.length === 0) {
        setActiveEntry((currentEntry) => (currentEntry === key ? null : currentEntry));
      }
      return next;
    });
  };

  // Filter UX refinement (Metadata Filter Sync): the one place
  // pendingThemeFilterCommit is consumed. App.jsx sends this only when a
  // Theme is clicked from HoverOverlay while Filter mode is already
  // active -- never for Tag (there is no Tag category here to sync
  // into -- see INDEX_ENTRIES above) and never while Filter mode is
  // inactive (that stays pure relationship exploration, untouched by
  // this effect, per the brief this implements).
  //
  // Deliberately routed through handleOptionToggle above -- the exact
  // same function a real click inside this drawer's own Theme list
  // already calls -- rather than a second, parallel way of mutating
  // `selection`. That's what makes this a genuine "as if the user
  // selected it in the Filter UI" commit rather than a shortcut that
  // could drift out of sync with drawer clicks: same toggle semantics
  // (add if absent, remove if already selected), same onFilterChange
  // report to App.jsx afterward -- selection stays the one place this
  // Filter's state lives, and App.jsx's activeFilterQuery still only
  // ever changes in response to that same report, exactly as it already
  // does for an ordinary drawer click.
  //
  // pendingThemeFilterCommit is a fresh {value} object on every request
  // (see its own comment in App.jsx), so the dependency array below only
  // needs that one value -- handleOptionToggle/onFilterChange are
  // recreated on every render and are not meant to retrigger this on
  // their own, only a genuinely new incoming request should.
  useEffect(() => {
    if (!pendingThemeFilterCommit) return;
    handleOptionToggle("theme", pendingThemeFilterCommit.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingThemeFilterCommit]);

  // Filter UX -- Clear All: resets every category to empty in one action.
  // Deliberately reuses the exact same setSelection/onFilterChange pair
  // handleOptionToggle above already calls per value -- this isn't a new
  // pipeline, it's that same pipeline handed the fully-cleared shape all
  // at once instead of one field at a time, so the result is identical to
  // removing every chip individually. App.jsx's own handleFilterChange
  // (untouched by this commit) still does everything it already does with
  // any Filter change: resolve Project values, combine with whatever
  // Search is currently committed, run the one existing query, and
  // regenerate the gallery once.
  //
  // Filter UX refinement ("I am done filtering"): this used to stop
  // there, leaving drawerSection/isFilterOpen completely untouched -- the
  // global Filter [N] x is reachable whether the drawer is open or
  // closed (it's the collapsed indicator, not part of the open drawer's
  // own content), so clearing every filter from it left the drawer open
  // with nothing left inside it to show. The two lines below are not a
  // new closing mechanism -- they're the exact same pair the Escape-key
  // handler above already uses to close this same drawer
  // (notifyIfFilterCloses(null) so onFilterOpenChange still fires exactly
  // when Filter itself actually transitions, then setDrawerSection(null)
  // for the state change that drives the existing open/close animation),
  // copied here rather than factored out only because there was already
  // exactly one other call site, not two. Deliberately NOT
  // handleFilterToggle(): that toggles off the *current* isFilterOpen,
  // which would reopen the drawer if this were ever clicked while it was
  // already closed (the collapsed Filter [N] x is visible in both
  // states) -- notifyIfFilterCloses/setDrawerSection(null) is
  // idempotent, so it's a no-op if the drawer wasn't open to begin with,
  // exactly what "closes the drawer" should mean here. Neither
  // activeEntry nor isExpanded is touched directly: the existing effect
  // keyed on drawerSection (above) already resets activeEntry to null
  // whenever drawerSection changes, and isExpanded is left exactly as
  // whatever it already was -- the same as it's always been left after
  // an Escape-key close or a plain Filter-toggle close, since both go
  // through this identical drawerSection(null) transition already. This
  // isn't a new inconsistency introduced here; it's the same close
  // behavior every existing path already has.
  const handleFilterClearAll = () => {
    setSelection(EMPTY_FILTER_SELECTION);
    onFilterChange?.(EMPTY_FILTER_SELECTION);
    notifyIfFilterCloses(null);
    setDrawerSection(null);
  };

  // Filter UX consistency pass -- Category Clear: handleFilterClearAll's
  // scoped sibling -- same "set a selection field, report it" shape, just
  // one category instead of all four. Deliberately a separate function
  // rather than generalizing handleFilterClearAll itself (e.g. an
  // optional key parameter): that function's own call site and behavior
  // (including the drawer-closing pass added since) stay completely
  // untouched, and this one needs to do the opposite of that specific
  // part -- "keep the drawer open" -- so it never touches drawerSection
  // at all. Every other active category survives untouched, since only
  // the one field named by `key` is replaced.
  const handleCategoryClear = (key) => {
    setSelection((current) => {
      const next = { ...current, [key]: [] };
      onFilterChange?.(next);
      return next;
    });
    // Drawer Auto-Collapse: Category Clear always empties this category
    // (nextValues.length is always 0 here), so it should collapse the
    // drawer the same way removing the last individual selection does --
    // same activeEntry mechanism, applied unconditionally since Clear's
    // result is always "zero selections."
    setActiveEntry((currentEntry) => (currentEntry === key ? null : currentEntry));
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

  // Layout Bug Fix -- Gallery Shift on Filter Open (Camera-based revision):
  // reports the drawer's own live rendered height (0 when closed, and
  // updating continuously through the grid-template-rows open/close
  // animation, and through every Theme/Project/Year expand/collapse and
  // "View All" toggle, since all of those change this same element's
  // rendered height) purely as a scale INPUT for App.jsx's Camera system
  // -- never a position, margin, or transform target here or there. This
  // is the only consumer; Header itself does nothing else with the value.
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
          onClick={() => {
            if (isChildPage) {
              navigate("/");
            } else {
              onLogoClick?.();
            }
          }}
          aria-label={
            isChildPage ? "Urbānum — home" : "Urbānum — reveal a new composition"
          }
        >
          <Logo className="brand" />
        </button>
        <nav className="top-menu" aria-label="Gallery navigation">
          <div className="top-menu__group" aria-label="Browse tools">
            {/* Filter UX -- Clear All: filter-control wraps the existing
                Filter toggle button and the new Clear All control as
                siblings (not nested -- a clickable x inside a <button> is
                invalid HTML), so hovering anywhere across the pair arms
                the x the same way hovering Search's own chip does.
                Clicking the Filter button itself is completely unchanged
                (still just handleFilterToggle); only the separate,
                sibling Clear All button clears anything. */}
            <div
              className="filter-control"
              onMouseEnter={() => setIsFilterClearArmed(true)}
              onMouseLeave={() => setIsFilterClearArmed(false)}
            >
              <button
                type="button"
                className={`text-control text-control--active text-control--filter${
                  isFilterOpen ? " text-control--engaged" : ""
                }`}
                aria-expanded={isFilterOpen}
                onClick={handleFilterToggle}
              >
                <span>Filter</span>
                {totalFilterCount > 0 && (
                  <span className="filter-count">
                    <span
                      className="index-drawer__option-bracket"
                      aria-hidden="true"
                    >
                      [
                    </span>
                    {totalFilterCount}
                  </span>
                )}
              </button>
              {totalFilterCount > 0 && (
                // Reuses index-drawer__option/-remove/--remove-armed
                // as-is (no new CSS for this control itself) -- the same
                // muted, understated styling and hover-reveal mechanics
                // Filter's own per-value chips already use, just applied
                // to "clear everything" instead of "clear one value."
                <button
                  type="button"
                  className={`index-drawer__option${
                    isFilterClearArmed
                      ? " index-drawer__option--remove-armed"
                      : ""
                  }`}
                  onClick={handleFilterClearAll}
                  onFocus={() => setIsFilterClearArmed(true)}
                  onBlur={() => setIsFilterClearArmed(false)}
                  aria-label="Clear all active filters"
                >
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
                </button>
              )}
            </div>

            <div className="nav-divider"></div>

            <div className="search-control">
              {/* Persistent Search Label (refinement): SEARCH itself is no
                  longer part of the committed/idle ternary below -- it's
                  the fixed anchor now, always rendered, exactly like
                  before a search is ever committed. Only what sits beside
                  it (the growing input line, or the committed chip) still
                  swaps. handleSearchToggle/isSearchOpen are untouched --
                  clicking SEARCH still does exactly what it always did. */}
              <button
                type="button"
                className="text-control text-control--muted"
                aria-expanded={isSearchOpen}
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleSearchToggle}
              >
                Search
              </button>
              {committedSearch ? (
                // Search Query Wiring: the collapsed committed state. Pure
                // visual reuse of Filter's own selected-option styling
                // (index-drawer__option/-selected/-bracket/-remove --
                // bracketed text, x hidden until a deliberate
                // hover/focus) -- not shared state or a shared component,
                // just the identical class names/markup shape so the two
                // read as one consistent design language. One click
                // target for the whole chip, same as Filter's own
                // selected options (see handleOptionToggle above).
                // search-control__chip only supplies the small left margin
                // SEARCH's own label needs now that it's always visible
                // beside this (see .search-control__chip in styles.css) --
                // no other visual property of the reused classes changes.
                <button
                  type="button"
                  className={`index-drawer__option index-drawer__option--selected search-control__chip${
                    isSearchChipRemoveArmed
                      ? " index-drawer__option--remove-armed"
                      : ""
                  }`}
                  onMouseEnter={() => setIsSearchChipRemoveArmed(true)}
                  onMouseLeave={() => setIsSearchChipRemoveArmed(false)}
                  onFocus={() => setIsSearchChipRemoveArmed(true)}
                  onBlur={() => setIsSearchChipRemoveArmed(false)}
                  onClick={handleSearchClear}
                  aria-label={`Clear search "${committedSearch}"`}
                >
                  <span
                    className="index-drawer__option-bracket"
                    aria-hidden="true"
                  >
                    [
                  </span>
                  <span className="index-drawer__option-text">
                    {committedSearch}
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
                </button>
              ) : (
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
              )}
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
          unfolding beneath the header, not a floating menu. .site-header is
          position:fixed, so this growing in place never pushes the archive
          out of flow the way an in-flow element would -- the archive's own
          vertical placement stays owned entirely by Application Layout's
          viewport-opening geometry in App.jsx (mount/resize only), and the
          archive simply dims in place while this is open (see
          .scroll-container--drawer-open). This element's own rendered
          height (ref'd below) is measured continuously and fed to App.jsx's
          Camera system, which scales the gallery down by exactly enough to
          keep clearing this drawer at whatever height it currently is --
          closed, mid-animation, or any category fully expanded. */}
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
               unified (no per-field stagger) reveal CSS -- just a different
               content row. Contact is the one interactive field here, and
               it reuses the identical field/label/handleAddClick pattern
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
                  // Filter UX consistency pass -- Category Clear: arms
                  // this row's own x on hover, exactly like
                  // .filter-control (the main Filter row's own wrapper)
                  // already does for isFilterClearArmed above -- same
                  // mouseenter/mouseleave pair, just keyed by which
                  // category this row is instead of one shared boolean.
                  onMouseEnter={() => setCategoryClearArmed(key)}
                  onMouseLeave={() =>
                    setCategoryClearArmed((current) =>
                      current === key ? null : current,
                    )
                  }
                >
                  <div className="index-drawer__field-row">
                    {/* Visual consistency fix -- Tight bracket spacing:
                        .index-drawer__field-row's own `gap: 10px` (its
                        existing, intentional spacing between the label and
                        the "+" button) was also landing BETWEEN the label
                        and the new Clear button below, since flex `gap`
                        applies between every adjacent child regardless of
                        that child's own rendered width -- so the collapsed
                        (max-width: 0) x still left a full 10px hole before
                        the "]", reading as "Theme [1    ]". The main
                        Filter control never had this problem because its
                        own label/Clear pair already lives inside its own
                        wrapper -- .filter-control (display: inline-flex,
                        no gap) -- entirely separate from any outer gap.
                        Reusing that exact class here, verbatim, around
                        just the label+Clear pair closes that gap the same
                        way, while the outer field-row's own 10px gap now
                        applies only where it always meant to: between this
                        wrapper and the "+" button. No new CSS, no changed
                        interaction -- purely a layout fix. */}
                    <div className="filter-control">
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
                        {/* Filter UX consistency pass -- Count formatting:
                            was its own "(N)" span (.index-drawer__count) --
                            now the exact same filter-count/
                            index-drawer__option-bracket markup the main
                            Filter's own count already uses (see
                            .filter-control above), reused verbatim rather
                            than a second bracket implementation. Only the
                            opening "[" lives here, same as the main
                            Filter's -- the closing "]" lives in the Clear
                            button below, exactly mirroring how the main
                            Filter's own "]" lives in its Clear All button
                            rather than here. */}
                        {values.length > 0 && (
                          <span className="filter-count">
                            <span
                              className="index-drawer__option-bracket"
                              aria-hidden="true"
                            >
                              [
                            </span>
                            {values.length}
                          </span>
                        )}
                      </button>

                      {/* Filter UX consistency pass -- Category Clear:
                          this category's own hover-revealed x, reusing
                          index-drawer__option/-remove/--remove-armed
                          exactly as the main Filter's own Clear All button
                          does (see its own comment above) -- same styling,
                          same hover-reveal mechanics, just scoped to one
                          category (handleCategoryClear(key)) instead of
                          every category at once. Only rendered once there's
                          something to clear, same as the count beside it
                          and the main Filter's own Clear All button. */}
                      {values.length > 0 && (
                        <button
                          type="button"
                          className={`index-drawer__option${
                            categoryClearArmed === key
                              ? " index-drawer__option--remove-armed"
                              : ""
                          }`}
                          onClick={() => handleCategoryClear(key)}
                          onFocus={() => setCategoryClearArmed(key)}
                          onBlur={() =>
                            setCategoryClearArmed((current) =>
                              current === key ? null : current,
                            )
                          }
                          aria-label={`Clear ${label} filter`}
                          tabIndex={isFilterOpen ? 0 : -1}
                        >
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
                        </button>
                      )}
                    </div>

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
