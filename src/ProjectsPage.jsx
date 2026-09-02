import { useState } from "react";
import Header from "./Header";
import { navigate } from "./navigation";
import { getProjects } from "./content";
import { getProjectBySlug, resolveInitialImageId } from "./projectContent";
import { getOptimizedImageSrc } from "./imageOptimization";

// Surgical Projects Route Cleanup: this page was previously the old
// desktop "About"-style composition (hero + three-column tile layout,
// ProjectTile, and its allImages-based stand-in tile arrays/meta/tags --
// see git history) at >640px, with the approved mobile project-list index
// (below) rendering only at <=640px. That desktop composition was never
// part of the approved direction and has been removed outright -- the
// list below is now the Projects page at every viewport width. CSS stays
// mobile-optimized for now, per this pass's own explicit scope; only
// which markup renders changed here, not how it's styled.

// Mobile Projects Index pass (client-approved wireframe): the ONLY
// mobile-specific data lookup this page needs -- one representative
// image per real Project, reusing the exact same Featured-then-lowest-
// sortOrder priority projectContent.js's resolveInitialImageId already
// establishes for "which image does this Project open on" (Project page
// deep-linking), rather than inventing a second, competing "which image
// represents this Project" rule. getProjectBySlug already Hidden-filters
// and sorts a Project's images (see that function's own comment); this
// just asks it the same question ProjectTemplate.jsx effectively asks on
// load, and reads the chosen item's own `image` (its real Sanity CDN
// URL, or null) off the result. Returns undefined when a Project has no
// visible images at all -- no invented placeholder, per this pass's own
// "do not invent metadata" instruction; the row below simply omits its
// thumbnail in that case.
function getProjectThumbnailSrc(project) {
  const full = getProjectBySlug(project.slug);
  if (!full || full.images.length === 0) return undefined;

  const archiveNumber = resolveInitialImageId(full, null);
  const leadImage = full.images.find(
    (item) => item.archiveNumber === archiveNumber,
  );
  // 400 is the smallest width tier optimizedImageWidths already
  // establishes elsewhere in this codebase (imageOptimization.js) --
  // reused here rather than an arbitrary new number, and safe for both
  // the Sanity branch (the CDN resizes on request to any width) and the
  // local-asset branch (a real pre-generated /img/optimized/400/... file
  // exists at that exact width).
  return leadImage?.image
    ? getOptimizedImageSrc(leadImage.image, 400)
    : undefined;
}

// Mobile Projects Index pass: one tappable row per real Project --
// thumbnail, title, location, year -- reusing the same navigate("/projects/
// :slug") mechanism every other "enter a Project" control on this site
// already uses (see e.g. ProjectBreadcrumb.jsx). No ?image= query param:
// omitting it is exactly what already tells ProjectTemplate.jsx to resolve
// its own initial image via resolveInitialImageId (Featured, then lowest
// sortOrder) -- the same function this row's own thumbnail lookup above
// reuses, so the image a visitor lands on matches what they tapped.
function MobileProjectRow({ project }) {
  const thumbnailSrc = getProjectThumbnailSrc(project);

  return (
    <button
      type="button"
      className="mobile-projects-row"
      onClick={() => navigate(`/projects/${project.slug}`)}
      aria-label={`View project: ${project.title}`}
    >
      {thumbnailSrc && (
        <img
          className="mobile-projects-row__thumb"
          src={thumbnailSrc}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="mobile-projects-row__text">
        <span className="mobile-projects-row__title">{project.title}</span>
        {project.location && (
          <span className="mobile-projects-row__location">
            {project.location}
          </span>
        )}
        {project.year != null && (
          <span className="mobile-projects-row__year">{project.year}</span>
        )}
      </div>
    </button>
  );
}

export default function ProjectsPage() {
  // Same drawer-height/opacity wiring App.jsx already uses for its own
  // scroll-container, reused as-is so the header's Filter/Search/Menu
  // drawer pushes and dims this page's content the same way it does the
  // gallery, rather than overlaying it differently here.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);
  // Surgical Projects Route Cleanup: no more isMobileUiMode branch here --
  // see this file's own top comment. Real Projects only (getProjects(),
  // the same live/Sanity-backed content ProjectTemplate.jsx and every
  // other real page on this site already reads from), sorted by the
  // CMS's own sortOrder field -- the same ordering projectContent.js's
  // getProjectsInOrder already applies for Previous/Next Project
  // navigation, rather than whatever incidental order getProjects()
  // happens to return.
  const orderedProjects = [...getProjects()].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  return (
    <div className="about-page">
      <Header
        onFilterOpenChange={setIsIndexDrawerOpen}
        onDrawerHeightChange={setIndexDrawerHeight}
      />

      <div
        className={`about-content${
          isIndexDrawerOpen ? " scroll-container--drawer-open" : ""
        }`}
        style={{
          // margin-top, not transform: on a child page the drawer stays
          // open for the whole visit (see Header.jsx), so this offset is
          // steady-state, not a brief animated toggle -- transform's per-
          // frame compositing cost, paid the whole time the page is open,
          // is what caused child-page scrolling to regress. margin-top
          // adds to this element's own existing padding-top via normal
          // document flow (no calc()/clamp duplication needed) and, with
          // no transition declared on it, changes apply instantly rather
          // than animating -- consistent with Menu no longer being a
          // brief, animated interaction here. The homepage keeps its own
          // transform-based push untouched (see App.jsx): Filter/Menu are
          // genuinely frequent, animated toggles there.
          marginTop: indexDrawerHeight
            ? `${Math.round(indexDrawerHeight) + 8}px`
            : undefined,
        }}
      >
        {/* Surgical Projects Route Cleanup: this list is now the
            Projects page at every viewport width -- the old desktop
            hero + three-column composition that used to live in this
            ternary's else-branch is removed outright (see this file's
            own top comment), not just hidden, so there is nothing left
            for a resize across 640px to swap to. */}
        <div className="mobile-projects-list">
          {orderedProjects.map((project) => (
            <MobileProjectRow key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
