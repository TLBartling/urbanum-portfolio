// Renders only the metadata that actually exists for this Archive Item,
// composed as a quiet editorial stack rather than a labeled form -- no
// "Themes:"/"Tags:"/"Location:" headings, and no placeholders for absent
// fields. Each line below is its own independently-guarded child of the
// parent's flex column (see .project-image-metadata in styles.css, an
// unchanged `display: flex; flex-direction: column` with its own `gap`)
// -- a missing field simply isn't rendered into the DOM at all, so the
// remaining lines close the gap on their own with no reserved/blank
// spacing left behind.
//
// Order: Archive Number (always) -> Themes (if any) -> Tags (if any) ->
// Location/Year on one shared line (if either exists) -> Description (if
// present, from the Content Contract's `caption` field -- the only
// free-text field an Archive Item has; no new field was added).
//
// Typography hierarchy (editorial pass): Themes are now the dominant,
// primary metadata line -- largest and heaviest of the group
// (.project-image-metadata__themes). Tags read one step down: smaller
// and lighter than Themes, as supporting keywords rather than a second
// headline (.project-image-metadata__detail). Archive Number and the
// Location/Year line are both the smallest, most muted tier -- quiet
// supporting metadata that frames the block without competing with it
// -- but they're no longer the same style: Archive Number keeps its
// small-caps/label styling (.project-image-metadata__number), while
// Location/Year reads as plain muted text, not a label
// (.project-image-metadata__location -- see styles.css for both).
// Description remains normal-weight body copy, with a touch more space
// above it than the uniform inter-line gap gives every other line
// (.project-image-metadata__caption).
//
// The Project's own title (project.title) is deliberately not rendered
// here -- ProjectHeader already shows it at the top of the page, and
// repeating it in this block would be a duplicate. This component's own
// `image.title` field (a per-photo caption, e.g. "Ground Plaza
// Approach") is likewise deliberately not rendered, unchanged from
// before.
export default function ImageMetadata({ image }) {
  // Themes: prefer the richer `themes` array (matches how the rest of the
  // app already treats theme data -- see metadataQueryEngine.js's own
  // comment on checking both fields); fall back to the singular `theme`
  // only if `themes` is absent/empty, so a theme is never silently lost.
  const themeList =
    Array.isArray(image.themes) && image.themes.length > 0
      ? image.themes
      : image.theme
        ? [image.theme]
        : [];

  const tagList = Array.isArray(image.tags) ? image.tags : [];

  const locationYear = [image.location, image.date]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="project-image-metadata">
      <span className="project-image-metadata__number">
        {image.archiveNumber}
      </span>
      {themeList.length > 0 && (
        <p className="project-image-metadata__themes">
          {themeList.join(" · ")}
        </p>
      )}
      {tagList.length > 0 && (
        <p className="project-image-metadata__detail">
          {tagList.join(" / ")}
        </p>
      )}
      {locationYear && (
        <p className="project-image-metadata__location">{locationYear}</p>
      )}
      {image.caption && (
        <p className="project-image-metadata__caption">{image.caption}</p>
      )}
    </div>
  );
}
