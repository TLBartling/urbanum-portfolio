import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import ImageViewer from "./ImageViewer";
import ImageNavigation from "./ImageNavigation";
import ProjectArchiveIndex from "./ProjectArchiveIndex";
import ProjectInfoPanel, { ProjectInfoTrigger } from "./ProjectInfoPanel";
import { getProjectBySlug, resolveInitialImageId } from "./projectContent";
import { navigate } from "./navigation";
import { getOptimizedImageSrc } from "./imageOptimization.js";

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
//   1. Project Image Viewer (ImageViewer.jsx) -- just the image itself,
//      with a short crossfade to the next one when it changes (see that
//      file's own comment). Image Navigation, the Archive Number, and
//      (as of the icon + position refinement, Josh review, second pass)
//      the Project Information trigger all used to render inside/over
//      this component too; all three have since moved out to the
//      page-level row described in point 2 -- see ImageViewer.jsx's own
//      comment for why.
//   2. Archive/Image Index + Image Navigation + Project Information
//      trigger (ProjectArchiveIndex.jsx, ImageNavigation.jsx,
//      ProjectInfoPanel.jsx's ProjectInfoTrigger) -- a page-level row
//      (imageNavRow below, .project-image-nav-row in styles.css) that is
//      a structural sibling of the image viewer and Project Navigation,
//      NOT nested inside .project-image-column. This is what makes the
//      row's position immune to the image's own rendered size, to the
//      metadata panel opening/closing (which narrows
//      .project-image-column, a box this row no longer lives inside),
//      and to switching between landscape and portrait images -- it was
//      previously nested inside the image column and drifted with all
//      three. Clickable as of an earlier pass (Josh review): the archive
//      number shares Project Information's own isInfoOpen state and
//      handleToggleInfo function (below) with ProjectInfoTrigger, so
//      clicking either one opens/closes the same panel via one state --
//      unchanged by the icon + position refinement, which only moved
//      ProjectInfoTrigger's own RENDER LOCATION into this same row (its
//      far-left column) alongside the two controls that already lived
//      here, not its open/close wiring. Synchronized as of the final
//      correction pass (Josh review): both the archive number and the
//      "N / M" count reflect `displayedImage`, not `currentImage` (see
//      below) -- see ImageNavigation.jsx's own comment for the bug this
//      fixes.
//   3. Project Information (ProjectInfoPanel.jsx) -- ProjectInfoTrigger
//      (now rendered in point 2's row, not over the image -- see that
//      file's own top comment for the icon + position refinement) and a
//      full-image opaque overlay that opens when activated. Owns its own
//      open/closed state here (`isInfoOpen`) since neither the image nor
//      the bottom nav needs to know about it -- opening/closing it never
//      changes image size or the bottom nav, and changing images never
//      closes it.
//   4. Project Navigation (ProjectNavigation.jsx) used to be a fourth
//      system here -- Previous / current Project / Next, rendered below
//      the horizontal rule beneath the image. Interaction refinement
//      (bottom-nav removal): removed outright, per explicit instruction
//      that the image/content area become the page's primary interface
//      without a competing bottom text treatment, and not replaced with
//      anything else. ProjectNavigation.jsx itself is left on disk,
//      unused, matching this codebase's own existing convention for a
//      retired page section (see ProjectHeader.jsx/ImageMetadata.jsx,
//      both left in place unused by an earlier pass, per this file's own
//      comment further down).
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

  // Adjacent-image preload ("holds the previous picture too long" fix,
  // Josh review): frame-by-frame comparison against the reference site's
  // own recording ruled out the crossfade's duration/easing as the
  // cause -- measured directly from both recordings' pixel data, this
  // site's 400ms ease-in-out curve is already a close match to the
  // reference's own curve shape. What actually differed was a real,
  // measurable gap (roughly 200ms in the reference recording used to
  // diagnose this) between the click and any visible change starting at
  // all: ImageViewer's incoming layer can't begin fading in until its
  // <img> has actually finished fetching + decoding the next photo (see
  // ImageViewer.jsx's own onLoad-gated reveal), and nothing before this
  // fix ever requested that photo before the visitor clicked. The old
  // image just sat fully static for however long that fetch took, on top
  // of the fade's own 400ms -- which is what read as "holding" it. This
  // warms the browser's HTTP cache for exactly the two images Image
  // Navigation's Previous/Next targets can jump to next (the same
  // images[selectedIndex -1 / +1] pair ImageNavigation.jsx computes,
  // recomputed here independently rather than threaded through props,
  // since this effect only needs the array + index, not any rendering
  // concern), at the same 1200px-width variants ImageViewer's own
  // <picture> can select (both jpg and webp, since which one the browser
  // actually picks depends on content negotiation this plain Image()
  // request can't replicate -- preloading both costs two extra requests
  // per neighbor but guarantees a real cache hit either way, versus
  // guessing wrong and paying for the fetch twice). Runs off
  // currentImageId, not displayedImageId, so the neighbor pair updates
  // immediately on every click rather than waiting for the current
  // photo's own fade to finish first -- keeping whatever's now adjacent
  // warm as early as possible, including during a fast run of repeated
  // clicks.
  useEffect(() => {
    if (!project) return undefined;
    const index = project.images.findIndex(
      (item) => item.archiveNumber === currentImageId,
    );
    if (index === -1) return undefined;
    const neighbors = [
      project.images[index - 1],
      project.images[index + 1],
    ].filter(Boolean);
    // De-duplicated via Set: for a live Sanity asset, getOptimizedImageSrc
    // ignores the extension argument entirely (buildSanityImageUrl uses
    // .auto("format") so Sanity's CDN picks the format itself) -- the
    // webp/jpg calls below would otherwise resolve to the exact same URL
    // and fire the identical request twice. For a local asset the two
    // calls genuinely differ, and both survive the dedupe untouched.
    const preloads = new Set(
      neighbors.flatMap((neighbor) => [
        getOptimizedImageSrc(neighbor.image, 1200, "webp"),
        getOptimizedImageSrc(neighbor.image, 1200, "jpg"),
      ]),
    );
    // Kept alive for the request's own lifetime -- an Image object with
    // no other reference can be garbage collected mid-fetch in some
    // engines, which would abort the very request this effect exists to
    // start. Not cleaned up early on deps change/unmount: an in-flight or
    // already-cached fetch is still worth letting finish (e.g. a
    // Previous click back to an image whose preload is still warming),
    // and Image has no real cancel short of reassigning .src, which
    // itself just starts another request.
    preloads.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [project, currentImageId]);

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
                  displayedImage={displayedImage}
                  onImageLoaded={handleImageLoaded}
                />
              </div>

              <ProjectInfoPanel
                project={project}
                image={currentImage}
                isOpen={isInfoOpen}
              />
            </div>

            <div className="project-image-nav-row">
              {/* Icon + position refinement (Josh review, second pass):
                  the Project Information trigger now lives here, at the
                  row's own far-left column, instead of overlaid on the
                  image via ImageViewer's old `overlay` slot -- see
                  ProjectInfoPanel.jsx's own top comment. Still the exact
                  same isInfoOpen/handleToggleInfo pair ProjectArchiveIndex
                  already shares below, so there is still exactly one
                  open/closed boolean with multiple entry points, never
                  independently tracked state. */}
              <ProjectInfoTrigger
                isOpen={isInfoOpen}
                onToggle={handleToggleInfo}
              />
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

      </div>
    </div>
  );
}
