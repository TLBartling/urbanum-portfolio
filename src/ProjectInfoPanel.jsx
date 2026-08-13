// Project Information -- one of the four systems the Project Page
// redesign explicitly separates out. Two pieces live in this one file
// since they're two halves of a single toggle, but they render in two
// different places on the page (see ProjectTemplate.jsx): ProjectInfoTrigger
// is the minimal icon-only control that sits inside the image's own
// top-right corner (passed into ImageViewer's `overlay` slot), and
// ProjectInfoPanel is the actual metadata content that opens beside the
// image as a right-hand column. Neither knows anything about Image
// Navigation, the Archive Number, or Project Navigation; both are driven
// entirely by the isOpen/onToggle state ProjectTemplate owns.
//
// No text label ("PROJECT INFORMATION"/"INFO"/"DETAILS") anywhere on the
// trigger, per explicit instruction (Josh review, revised across several
// passes: a circled-i was rejected as "too visually explicit... generic
// information UI element"; a follow-up circular hover/focus backdrop
// button was then also rejected -- "no circular backgrounds... no filled
// or translucent button background"). The trigger reuses Urbanum's own
// existing plus-glyph control -- the bare "+" Header.jsx already uses for
// "add"/"expand" (see .index-drawer__add, the Filter drawer's own
// category-expand button) -- with NO background/border/pill of any kind,
// still just a bare character, and invisible by default: it only renders
// visible on hover (or keyboard focus) of the photo itself, via CSS on
// .project-image-frame (see styles.css). Once the panel is open, the icon
// stays visible regardless of hover, so the close control is never hidden
// while a visitor is interacting with the open panel.
//
// Legibility (Josh review): a flat glyph color was sometimes unreadable
// depending on the photograph underneath it. Rather than add any new
// background/shadow/glow, the glyph uses an adaptive CSS treatment --
// white text with mix-blend-mode: difference (see styles.css) -- which
// inverts per-pixel against whatever's behind it, staying visible over
// bright sky, dark foliage, or mid-tone surfaces alike, without
// introducing any new permanent UI color.
//
// Open/close is communicated with one glyph, never swapped for a
// different icon: the "+" rotates 45° via CSS transform when the panel
// opens, which visually turns its symmetrical vertical/horizontal bars
// into a diagonal cross -- an "×" -- and rotates back to "+" on close,
// timed to land alongside the panel's own opening motion so the two read
// as one coordinated transition rather than two unrelated animations.
//
// Data-completeness correction (Josh review): a prior pass showed only
// project.title/location/dates/description and reasoned that Themes/Tags
// "belong to the Archive Item, not the Project, and aren't in this
// panel's field list" -- true as far as it went (re-confirmed against
// ARCHIVE_ITEMS_QUERY/normalizeArchiveItem in cms/queries.js: themes,
// tags, title, date, and caption all live on the Archive Item, never on
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
// description / tags). No visible field labels anywhere ("THEMES" /
// "TAGS" / "DESCRIPTION") -- Urbanum's existing convention for this panel
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
//   Scale / Passive Cooling / Facade <- image.tags (existing __tags
//                              treatment, small/quiet, unchanged
//                              slash-separated presentation)
//
// The image's own `title` and `date` lines from the previous pass are
// dropped here -- not part of the desired hierarchy above, and (per the
// prior pass's own data-completeness trace) never duplicated data the
// Project-level fields didn't already cover in a more useful place
// (title is the panel's own h2; the image's `date` duplicated
// projectYear-style information the new `year` line now covers more
// directly). Every field below keeps its own presence guard --
// themes/tags/caption/description are frequently absent on non-Featured
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
      {/* Always the same "+" character -- .project-info-trigger--open
          (see styles.css) rotates it 45deg via CSS transform rather than
          swapping in a different glyph. */}
      <span className="project-info-trigger__glyph" aria-hidden="true">
        +
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
  const tagList = Array.isArray(image?.tags) ? image.tags : [];
  // The one consolidated "Description" line -- the current image's own
  // caption when it has one, otherwise the Project's own description.
  // Never both: the desired hierarchy has exactly one description-shaped
  // line, not a per-image one stacked on top of a per-project one.
  const description = image?.caption || project?.description;

  const hasDescriptiveMeta =
    themeList.length > 0 || Boolean(description) || tagList.length > 0;

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
            {description && (
              <p className="project-info-panel__description">
                {description}
              </p>
            )}
            {tagList.length > 0 && (
              <p className="project-info-panel__tags">{tagList.join(" / ")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
