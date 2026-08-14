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
//
// Image-first redesign (Josh review): gained a third, center piece --
// `currentProject` -- a quiet, non-interactive "you are here" indicator
// between Previous and Next, per explicit instruction that it must NOT be
// a link (this Project is already the page you're on) and must NOT be
// visually louder than Previous/Next. It carries its own "Current" label,
// reusing .project-navigation__label verbatim -- EXACTLY the same small
// uppercase gray treatment Previous/Next's own "Previous"/"Next" labels
// use, not bolded or resized -- specifically so the center block doesn't
// read as ambiguously similar to a third navigable option. Its title
// beneath that label reuses the exact same .project-navigation__title
// class Previous/Next already use, so the typography matches exactly
// rather than merely resembling it.
//
// Final refinement (Josh review): the location line this block used to
// carry beneath the title is removed -- location belongs to the Project
// Information metadata panel (ProjectInfoPanel.jsx, which already shows
// it), not duplicated here. This block is now title-only, exactly
// mirroring Previous/Next's own label+title shape (just not a link).
//
// The layout itself moved from flex (space-between) to a 3-column grid
// (see styles.css) -- space-between can't guarantee this middle block is
// truly centered once it's flanked by two Previous/Next blocks of
// different lengths; a grid with a fixed center column can. Previous/Next's
// own internal layout, click behavior, and destination URLs are
// unchanged.
//
// previousProject/nextProject are always non-null in practice (see
// projectContent.js's cyclic wraparound), so the old
// `if (!previousProject && !nextProject) return null` guard at the top of
// this component never actually fired -- it's removed here rather than
// kept, since keeping it would incorrectly hide the always-present
// current-project indicator in the one hypothetical case it could ever
// matter (an empty catalog). Previous/Next each still independently guard
// their own rendering exactly as before.
export default function ProjectNavigation({
  previousProject,
  nextProject,
  currentProject,
}) {
  return (
    <div className="project-navigation">
      <div className="project-navigation__side project-navigation__side--previous">
        {previousProject && (
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
        )}
      </div>

      {currentProject && (
        <div className="project-navigation__current">
          <span className="project-navigation__label">Current</span>
          <span className="project-navigation__title">
            {currentProject.title}
          </span>
        </div>
      )}

      <div className="project-navigation__side project-navigation__side--next">
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
    </div>
  );
}
