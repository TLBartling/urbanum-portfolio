import { navigate } from "./navigation";

// Project Navigation: moves between Projects, in the order the CMS
// defines (Project.sortOrder, resolved once in projectContent.js), never
// alphabetical and never creation date. Deliberately separate from
// ImageViewer's Image Navigation, which never changes the Project or
// leaves this page -- this is the only place that does.
//
// Navigating here changes the URL's slug with no ?image= param, so the
// destination project resolves its own first image (Featured, else lowest
// sortOrder) via the same resolveInitialImageId rule used on a fresh
// visit -- there's no "selected image" to preserve when the Project
// itself is what changed.
export default function ProjectNavigation({ previousProject, nextProject }) {
  if (!previousProject && !nextProject) return null;

  return (
    <div className="project-navigation">
      {previousProject ? (
        <button
          type="button"
          className="project-navigation__control project-navigation__control--previous"
          onClick={() => navigate(`/projects/${previousProject.slug}`)}
        >
          <span className="project-navigation__label">Previous</span>
          <span className="project-navigation__title">
            {previousProject.title}
          </span>
        </button>
      ) : (
        <span />
      )}

      {nextProject && (
        <button
          type="button"
          className="project-navigation__control project-navigation__control--next"
          onClick={() => navigate(`/projects/${nextProject.slug}`)}
        >
          <span className="project-navigation__label">Next</span>
          <span className="project-navigation__title">
            {nextProject.title}
          </span>
        </button>
      )}
    </div>
  );
}
