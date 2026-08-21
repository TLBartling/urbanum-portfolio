import { useMemo, useState } from "react";
import Header from "./Header";
import ImageViewer from "./ImageViewer";
import ImageNavigation from "./ImageNavigation";
import ProjectArchiveIndex from "./ProjectArchiveIndex";
import ProjectInfoPanel, { ProjectInfoTrigger } from "./ProjectInfoPanel";
import ProjectNavigation from "./ProjectNavigation";
import { getProjectBySlug, resolveInitialImageId } from "./projectContent";
import { navigate } from "./navigation";

// The one reusable template every Project on the site renders through.
// Everything about a specific project -- title, images, neighbors -- comes
// in as data resolved from `slug`; nothing here is authored per-project.
//
// Router.jsx renders this with key={slug}, so navigating between Projects
// (Previous/Next Project) fully resets this component's state instead of
// trying to reconcile it in place -- the simplest way to guarantee a new
// project always starts clean, with no image selection carried over from
// the last one. This is an implementation detail only: it's still the
// exact same template/file rendering every project, which is what "one
// reusable Project Template" actually means architecturally.
//
// Image-first redesign (Josh review): this page is now composed of four
// deliberately separated systems, each owning exactly one concern, none
// coupled to the others' internals:
//   1. Project Image Viewer (ImageViewer.jsx) -- just the image itself
//      plus the Project Information trigger overlaid on it. Image
//      Navigation and the Archive Number used to render inside this
//      component too; both moved out (final correction pass, Josh
//      review) -- see point 2 below and ImageViewer.jsx's own comment.
//   2. Archive/Image Index + Image Navigation (ProjectArchiveIndex.jsx,
//      ImageNavigation.jsx) -- a page-level row (imageNavRow below,
//      .project-image-nav-row in styles.css) that is a structural
//      sibling of the image viewer and Project Navigation, NOT nested
//      inside .project-image-column. This is what makes the row's
//      position immune to the image's own rendered size, to the metadata
//      panel opening/closing (which narrows .project-image-column, a
//      box this row no longer lives inside), and to switching between
//      landscape and portrait images -- it was previously nested inside
//      the image column and drifted with all three. Clickable as of an
//      earlier pass (Josh review): the archive number shares Project
//      Information's own isInfoOpen state and handleToggleInfo function
//      (below) with ProjectInfoTrigger, so clicking either one
//      opens/closes the same panel via one state. Synchronized as of the
//      final correction pass (Josh review): both the archive number and
//      the "N / M" count reflect `displayedImage`, not `currentImage`
//      (see below) -- see ImageNavigation.jsx's own comment for the bug
//      this fixes.
//   3. Project Information (ProjectInfoPanel.jsx) -- an icon-only trigger
//      that sits inside the image's own top-right corner (passed into
//      ImageViewer's `overlay` slot) and a right-hand panel that opens
//      beside the image when activated. Owns its own open/closed state
//      here (`isInfoOpen`) since neither the image nor the bottom nav
//      needs to know about it -- opening/closing it never changes image
//      size or the bottom nav, and changing images never closes it.
//   4. Project Navigation (ProjectNavigation.jsx) -- Previous / current
//      Project (title only, labeled "Current," a non-interactive "you are
//      here" indicator) / Next. Entirely independent of Image Navigation
//      and of whether Project Information is open.
//
// Selected vs. displayed image (Josh review, final correction pass): two
// separate pieces of state now track "which image," on purpose.
// `currentImageId` is what the visitor has actually clicked/requested --
// it drives the URL, and it's what ImageViewer is told to load next.
// `displayedImageId` only advances once that image has actually finished
// loading (see handleImageLoaded, wired to ImageViewer's onImageLoaded).
// Image Navigation's counter and the Archive Number both read from
// `displayedImage`, not `currentImage` -- this is the fix for a real bug
// where clicking next/previous updated the counter text immediately,
// before the new photo had loaded, so the page could briefly claim "2 /
// 7" while photo 1 was still the only thing on screen. Previous/Next's
// own TARGETS still key off `currentImage` (the requested one), so
// repeated clicking still advances predictably through the real sequence
// even before any single image finishes loading -- see
// ImageNavigation.jsx's own comment for the full reasoning. The metadata
// panel is unaffected by this split -- it still reads `currentImage`,
// unchanged, since it wasn't part of the reported bug and changing its
// timing wasn't asked for.
//
// The old ProjectHeader (title/location above the image) is no longer
// rendered here, per explicit instruction -- the underlying data
// (project.title/project.location) isn't gone. project.title now surfaces
// in two places (ProjectInfoPanel's right-hand column, and
// ProjectNavigation's center "current project" block), while
// project.location surfaces only in ProjectInfoPanel -- deliberately not
// duplicated into the bottom nav (Josh review: an earlier pass showed
// location under "Current" too; removed so that block stays a title-only
// peer of Previous/Next). ProjectHeader.jsx and ImageMetadata.jsx are both
// left on disk, unused by this page now, rather than deleted -- deleting
// files wasn't part of what was asked here.
//
// Data-completeness correction (Josh review): an earlier pass reasoned
// that Themes/per-image fields belonged only to the Archive Item,
// not the Project, and left them out of the Project Information panel
// entirely on that basis. That reasoning about WHERE the fields live was
// correct (confirmed again against cms/queries.js's
// ARCHIVE_ITEMS_QUERY/normalizeArchiveItem) but the conclusion was wrong:
// the panel is meant to expose "the actual metadata available for that
// image/project," and the currently-displayed Archive Item is part of
// that. ProjectInfoPanel now receives the current image as a second prop
// (`image`, the exact object ImageViewer/ProjectArchiveIndex already
// use) alongside `project`, and renders both the Project's own fields
// (title, location, dates, description -- confirmed via mockProjects.js
// and the locked Sanity Project schema to be the only ones that exist at
// that level) and the current image's own populated fields (title,
// themes, date, caption). See ProjectInfoPanel.jsx's own comment
// for the full data-flow trace and the one field (the image's own
// `location`) deliberately still excluded, and why.
export default function ProjectTemplate({ slug, imageId }) {
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const project = useMemo(() => getProjectBySlug(slug), [slug]);

  // Seeded once from the URL's ?image= param on mount (or remount, on a
  // slug change) via resolveInitialImageId -- this is what preserves the
  // visitor's context from the homepage click. After that, Image
  // Navigation updates this directly; it doesn't re-derive from the URL on
  // every render, since the URL is kept in sync as a side effect of
  // selection, not the other way around (see handleSelectImage below).
  const [currentImageId, setCurrentImageId] = useState(() =>
    resolveInitialImageId(project, imageId),
  );

  // Trails currentImageId (Josh review, final correction pass): starts
  // equal to it (nothing stale to contradict on first paint), and only
  // catches up once handleImageLoaded fires -- see this file's own top
  // comment ("Selected vs. displayed image") for why this exists.
  const [displayedImageId, setDisplayedImageId] = useState(currentImageId);

  if (!project) {
    return (
      <div className="about-page">
        <Header
          onFilterOpenChange={setIsIndexDrawerOpen}
          onDrawerHeightChange={setIndexDrawerHeight}
        />
        <div className="about-content">
          <p className="project-not-found">Project not found.</p>
        </div>
      </div>
    );
  }

  const currentImage =
    project.images.find((item) => item.archiveNumber === currentImageId) ??
    project.images[0] ??
    null;

  // Falls back to currentImage (not null) if displayedImageId doesn't
  // resolve to anything in the current project's image list -- e.g. a
  // slug change mid-transition, where a stale displayedImageId from the
  // previous project can't be found in the new one. currentImage is
  // always resolvable at this point (see above), so this can never be
  // null when currentImage isn't.
  const displayedImage =
    project.images.find((item) => item.archiveNumber === displayedImageId) ??
    currentImage;

  // Used by both the initial-load resolution above and by Image
  // Navigation (ImageNavigation.jsx) -- selecting an image updates the
  // requested/current state immediately (so ImageViewer starts loading it
  // right away) and separately syncs the URL's ?image= param, so a
  // refresh or a shared link reproduces the same image without depending
  // on the Router re-rendering this component (it won't: the pathname
  // doesn't change, only the query string, so this instance just keeps
  // its own state authoritative and the URL update is one-way).
  // Deliberately does not touch isInfoOpen -- changing images must never
  // open or close the Project Information panel, per the redesign's
  // explicit "metadata open while changing images" test case. Does not
  // touch displayedImageId either -- see handleImageLoaded below for what
  // does.
  const handleSelectImage = (archiveNumber) => {
    setCurrentImageId(archiveNumber);
    navigate(`/projects/${project.slug}?image=${archiveNumber}`);
  };

  // Wired to ImageViewer's onImageLoaded -- fires once the currently
  // requested image has actually finished loading. Guarded against
  // stale/out-of-order firing (Josh review, final correction pass): only
  // accepted if it still matches whatever's currently requested, so a
  // late-arriving load event for an image the visitor has since navigated
  // away from can never regress the display backwards. In the normal
  // case this guard never trips -- changing an <img>'s src already
  // cancels its previous in-flight request -- but it costs nothing to be
  // certain the visible number can never contradict the visible photo.
  const handleImageLoaded = (archiveNumber) => {
    if (archiveNumber === currentImageId) {
      setDisplayedImageId(archiveNumber);
    }
  };

  // Shared by ProjectInfoTrigger (the +/X control) and ProjectArchiveIndex
  // (the clickable archive number) -- Josh review, final polish pass: the
  // archive number now opens/closes the same Project Information panel
  // the +/X control does, and must use this exact function reference for
  // both so there is one open/closed boolean with two entry points, never
  // two independently tracked accordion states.
  const handleToggleInfo = () => setIsInfoOpen((open) => !open);

  return (
    <div className="about-page">
      <Header
        onFilterOpenChange={setIsIndexDrawerOpen}
        onDrawerHeightChange={setIndexDrawerHeight}
      />

      <div
        className={`about-content project-content${
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
        {currentImage ? (
          // Josh review, final correction pass: a Fragment, not a single
          // wrapper div, since Image Navigation/the Archive Number are no
          // longer nested inside .project-image-column -- imageNavRow is
          // now a structural sibling of .project-viewer (see this file's
          // own top comment for why), not a descendant of it.
          <>
            {/* No open/closed modifier class on this wrapper itself --
                the open/close styling lives entirely on ProjectInfoPanel's
                own .project-info-panel--open (driven by the same
                `isInfoOpen` state), so .project-viewer only ever needs
                its one, constant flex-row rule (see styles.css). */}
            <div className="project-viewer">
              <div className="project-image-column">
                <ImageViewer
                  image={currentImage}
                  onImageLoaded={handleImageLoaded}
                  overlay={
                    <ProjectInfoTrigger
                      isOpen={isInfoOpen}
                      onToggle={handleToggleInfo}
                    />
                  }
                />
              </div>

              <ProjectInfoPanel
                project={project}
                image={currentImage}
                isOpen={isInfoOpen}
              />
            </div>

            <div className="project-image-nav-row">
              <ProjectArchiveIndex
                archiveNumber={displayedImage.archiveNumber}
                isOpen={isInfoOpen}
                onToggle={handleToggleInfo}
              />
              <ImageNavigation
                images={project.images}
                selectedImage={currentImage}
                displayedImage={displayedImage}
                onSelectImage={handleSelectImage}
              />
            </div>
          </>
        ) : (
          <p className="project-not-found">
            This project has no visible images yet.
          </p>
        )}

        <ProjectNavigation
          previousProject={project.previousProject}
          nextProject={project.nextProject}
          // Title only, per explicit instruction -- location now lives
          // solely in the Project Information panel (ProjectInfoPanel.jsx)
          // and is deliberately not duplicated here.
          currentProject={{ title: project.title }}
        />
      </div>
    </div>
  );
}
