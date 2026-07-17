import { useMemo, useState } from "react";
import Header from "./Header";
import ProjectHeader from "./ProjectHeader";
import ImageViewer from "./ImageViewer";
import ImageMetadata from "./ImageMetadata";
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
export default function ProjectTemplate({ slug, imageId }) {
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

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

  // Used by both the initial-load resolution above and by ImageViewer's
  // Image Navigation -- selecting an image updates the visible state
  // immediately and separately syncs the URL's ?image= param, so a refresh
  // or a shared link reproduces the same image without depending on the
  // Router re-rendering this component (it won't: the pathname doesn't
  // change, only the query string, so this instance just keeps its own
  // state authoritative and the URL update is one-way).
  const handleSelectImage = (archiveNumber) => {
    setCurrentImageId(archiveNumber);
    navigate(`/projects/${project.slug}?image=${archiveNumber}`);
  };

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
        <ProjectHeader project={project} />

        {currentImage ? (
          <>
            <ImageViewer
              image={currentImage}
              images={project.images}
              onSelectImage={handleSelectImage}
            />
            <ImageMetadata image={currentImage} />
          </>
        ) : (
          <p className="project-not-found">
            This project has no visible images yet.
          </p>
        )}

        <ProjectNavigation
          previousProject={project.previousProject}
          nextProject={project.nextProject}
        />
      </div>
    </div>
  );
}
