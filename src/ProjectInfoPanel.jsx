import RichText from "./RichText";

// Project Information -- one of the four systems the Project Page
// redesign explicitly separates out. Two pieces live in this one file
// since they're two halves of a single toggle, but they render in two
// different places on the page (see ProjectTemplate.jsx): ProjectInfoTrigger
// is the minimal icon-only control, and ProjectInfoPanel is the actual
// metadata content. Neither knows anything about Image Navigation, the
// Archive Number, or Project Navigation; both are driven entirely by the
// isOpen/onToggle state ProjectTemplate owns.
//
// Interaction refinement (info-symbol + opaque-overlay pass): previously
// the trigger sat inside the image's own top-right corner, invisible
// until the photo was hovered, and the panel opened as a right-hand
// column beside the image (narrowing it). Per explicit instruction this
// is now a persistent, always-visible control -- discoverable without
// hovering the image at all -- and the panel is now an OPAQUE overlay
// that fully covers the image while open, rather than a side column that
// shares space with it (see .project-info-panel in styles.css). Nothing
// about what data this shows, or how it's derived, changed -- only how
// it's triggered and how it's presented once open.
//
// Icon + position refinement (Josh review, second pass): two more changes
// on top of the above, both purely presentational -- the toggle/close
// LOGIC below (isOpen/onToggle, aria-expanded/aria-label) is completely
// unchanged.
//
//   Glyph: the bare "+"/rotate-to-"×" glyph (history below) is replaced
//   with an explicit information mark -- a lowercase "i" centered inside
//   a thin circle (border only, no fill -- see .project-info-trigger__glyph
//   in styles.css), so the control reads unambiguously as "information,"
//   not as a generic "add/expand" control borrowed from elsewhere. Open
//   state is now communicated by swapping the glyph's own character to
//   "×" (still the exact same button, still the one and only close
//   control -- no second, differently-designed close element anywhere)
//   rather than rotating "i" 45°, since rotating a letterform doesn't
//   read as an "×" the way rotating the old symmetrical "+" did.
//
//   Position: no longer `position: fixed` to the viewport's own edge.
//   Per explicit instruction this control now lives inline in the same
//   row as the Archive Number and Image Navigation counter
//   (.project-image-nav-row in ProjectTemplate.jsx/styles.css), at that
//   row's own far-left column -- occupying the same horizontal baseline
//   as "[026]" and "‹ 5 / 7 ›" rather than floating independently against
//   the image. ProjectTemplate.jsx renders this component directly inside
//   that row now (no longer passed through ImageViewer's old `overlay`
//   slot -- see ImageViewer.jsx's own comment for why that slot is gone).
//
// History (superseded by the above, kept for context): originally a
// circled-i was rejected as "too visually explicit... generic information
// UI element," then a plus-glyph with a circular hover/focus backdrop was
// also rejected -- "no circular backgrounds... no filled or translucent
// button background" -- landing on a bare "+" reusing Header.jsx's own
// .index-drawer__add glyph. That "no filled background" reasoning still
// holds today (the new circle is a thin outline only, never a filled or
// translucent pill), but the glyph itself has since been asked for
// explicitly as a circled "i" -- an unambiguous information mark, not
// Urbanum's own "add/expand" character repurposed to mean something else.
//
// Legibility (superseded twice over, kept for history): the glyph
// originally sat over variable photograph content and needed an adaptive
// mix-blend-mode treatment to stay legible against any photo. Once it
// moved to the viewport's own edge over the page's plain background (the
// first interaction refinement above), and now that it lives inline in
// the metadata row (this pass), it's simply a flat, ordinary color -- see
// styles.css.
//
// Data-completeness correction (Josh review): a prior pass showed only
// project.title/location/dates/description and reasoned that Themes
// "belong to the Archive Item, not the Project, and aren't in this
// panel's field list" -- true as far as it went (re-confirmed against
// ARCHIVE_ITEMS_QUERY/normalizeArchiveItem in cms/queries.js: themes,
// title, date, and caption all live on the Archive Item, never on
// Project), but wrong as a reason to omit them. This panel is the one
// place on the page metadata can be seen at all, and the Archive Item
// currently on screen is exactly as much "the actual metadata available
// for that image" as the Project's own fields are. So this component
// takes a second prop, `image` (the current Archive Item, the same
// object ImageViewer/ProjectArchiveIndex already receive from
// ProjectTemplate) -- traced end to end: Sanity's archiveItem schema ->
// ARCHIVE_ITEMS_QUERY -> normalizeArchiveItem -> content/*.js ->
// projectContent.js's getVisibleItemsForProject -> project.images ->
// ProjectTemplate's `currentImage` -> here.
//
// One deliberate exception: the current image's own `location` is NOT
// separately rendered here, even though the field exists on the schema.
// In every populated record in the current dataset it's an exact
// duplicate of the Project's own location (the Featured item for a
// Project always sets both to the same value) -- rendering it would mean
// literally repeating the same city/state string twice in one panel, not
// exposing new information. Flagged, not silently dropped: if a future
// Archive Item's location can genuinely differ from its Project's, this
// is worth revisiting.
//
// Typography hierarchy (Josh review, final polish pass): restructured
// into two groups -- an identity block (title / location / year) and,
// beneath a hairline divider, a descriptive-metadata block (themes /
// description). No visible field labels anywhere ("THEMES" /
// "DESCRIPTION") -- Urbanum's existing convention for this panel
// has never used them, so hierarchy comes from typography, spacing, and
// grouping alone, matching how the rest of this panel already works.
//
//   Venetian House          <- project.title (h2, strongest, unchanged)
//   Miami, FL               <- project.location (quieter, unchanged)
//   2026                    <- project.year (quiet/secondary identity data,
//                              NOT a heading -- see Data-flow correction
//                              below)
//   ──────────────────      <- divider (existing panel/image-meta treatment)
//   Light · Sequence · ...  <- image.themes (existing __themes treatment,
//                              secondary to the title above)
//   Colorful homes in a row. <- description: image.caption, falling back
//                              to project.description when the current
//                              image has none of its own
//
// The image's own `title` and `date` lines from the previous pass are
// dropped here -- not part of the desired hierarchy above, and (per the
// prior pass's own data-completeness trace) never duplicated data the
// Project-level fields didn't already cover in a more useful place
// (title is the panel's own h2; the image's `date` duplicated
// projectYear-style information the new `year` line now covers more
// directly). Every field below keeps its own presence guard --
// themes/caption/description are frequently absent on non-Featured
// items or projects with no description in the current dataset (see
// mockArchiveItems.js/mockProjects.js) -- so an unpopulated field
// disappears cleanly (no divider, no empty line, no stray gap) rather
// than rendering a blank space.
//
// Data-flow correction: project.year now reaches this component --
// PROJECTS_QUERY (cms/queries.js) has always selected the real Sanity
// `year` field, but normalizeProject silently dropped it before this
// pass; project.dates (a mock-only string range with no schema
// counterpart) is left unused here, in favor of the actual schema field.
// See cms/queries.js's own comment on normalizeProject for the full
// trace.
export function ProjectInfoTrigger({ isOpen, onToggle }) {
  return (
    <button
      type="button"
      className={`project-info-trigger${
        isOpen ? " project-info-trigger--open" : ""
      }`}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close project information" : "Project information"}
    >
      {/* Character swaps "i" <-> "×" based on isOpen -- the thin circle
          around it (styles.css) never changes, only the glyph inside it,
          so this reads as one control toggling state rather than two
          different icons. See this file's own top comment for why this
          replaced the old rotate-the-"+" treatment. */}
      <span className="project-info-trigger__glyph" aria-hidden="true">
        {isOpen ? "×" : "i"}
      </span>
    </button>
  );
}

export default function ProjectInfoPanel({ project, image, isOpen }) {
  // Same derivation ImageMetadata.jsx already established: prefer the
  // richer `themes` array, fall back to the singular `theme` only if
  // `themes` is absent/empty, so a theme is never silently lost.
  const themeList =
    Array.isArray(image?.themes) && image.themes.length > 0
      ? image.themes
      : image?.theme
        ? [image.theme]
        : [];
  // The one consolidated "Description" line -- the current image's own
  // caption when it has one, otherwise the Project's own description.
  // Never both: the desired hierarchy has exactly one description-shaped
  // line, not a per-image one stacked on top of a per-project one.
  //
  // CMS typography foundation pass: `image.caption` (Archive Item's own
  // `description` field, aliased in cms/queries.js) is deliberately left
  // out of this pass's rich-text upgrade -- Archive Item has no rich-text
  // field of its own -- so it stays exactly the plain string it already
  // was and keeps first priority here, unchanged. Only the Project-level
  // fallback gains a rich option: `project.descriptionRichText` (new) is
  // preferred over `project.description` (legacy plain, still the
  // fallback of the fallback) when the image has no caption of its own.
  const hasRichDescription =
    !image?.caption &&
    Array.isArray(project?.descriptionRichText) &&
    project.descriptionRichText.length > 0;
  const plainDescription = image?.caption || project?.description;

  const hasDescriptiveMeta =
    themeList.length > 0 || hasRichDescription || Boolean(plainDescription);

  return (
    <div
      className={`project-info-panel${isOpen ? " project-info-panel--open" : ""}`}
      aria-hidden={!isOpen}
    >
      <div className="project-info-panel__inner">
        <h2 className="project-info-panel__title">{project.title}</h2>
        {project.location && (
          <p className="project-info-panel__location">{project.location}</p>
        )}
        {project.year && (
          <p className="project-info-panel__year">{project.year}</p>
        )}

        {hasDescriptiveMeta && (
          <div className="project-info-panel__descriptive">
            {themeList.length > 0 && (
              <p className="project-info-panel__themes">
                {themeList.join(" · ")}
              </p>
            )}
            {hasRichDescription ? (
              <RichText
                value={project.descriptionRichText}
                paragraphClassName="project-info-panel__description"
              />
            ) : (
              plainDescription && (
                <p className="project-info-panel__description">
                  {plainDescription}
                </p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
