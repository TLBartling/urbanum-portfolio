// Archive/Image Index -- one of the four systems the Project Page
// redesign explicitly separates out (see ProjectTemplate.jsx's own
// comment for the full breakdown). It only ever displays an Archive
// Number. It doesn't know about Image Navigation or Project Navigation,
// and neither of those knows about this.
//
// Archive-number presentation rule (unchanged from before this redesign):
// bracketed site-wide, e.g. "[026]" -- display-only, wraps whatever value
// this field already holds rather than reformatting it.
//
// Page-level position (Josh review, final correction pass): rendered by
// ProjectTemplate.jsx alongside ImageNavigation.jsx in a shared row that
// is now a structural sibling of the image viewer, not nested inside
// .project-image-column -- see .project-image-nav-row in styles.css. The
// `archiveNumber` this component receives is the DISPLAYED image's own
// number (the one whose photo has actually finished loading), the same
// synchronization ImageNavigation.jsx's counter uses -- see that file's
// own comment for why, and ProjectTemplate.jsx for where displayedImage
// comes from.
//
// Clickable, shares the info panel's own open/close state (Josh review,
// final polish pass): clicking the archive number now opens the Project
// Information panel, and closes it if already open -- via the exact same
// isOpen/onToggle pair ProjectInfoTrigger already receives from
// ProjectTemplate (see that file: both this component and
// ProjectInfoTrigger are handed the identical `isInfoOpen` state and the
// identical toggle function reference), so there is exactly one
// open/closed boolean driving both controls, never two independently
// tracked accordion states that could drift out of sync with each other.
//
// The number itself keeps its exact existing typography/formatting --
// still the plain .project-archive-index__number span, untouched by the
// new button wrapped around it (border/background/padding/font all reset
// on .project-archive-index__button -- the same defensive `font: inherit`
// reset pattern already established for Previous/Next in
// .project-navigation__control, see that rule's own comment in
// styles.css for why a <button> needs this and a <span> doesn't).
// Deliberately not bolded, not resized, not given a button-like
// background or border -- per explicit instruction, this should read as
// a quiet piece of the page's own typography that happens to be
// interactive, not a conventional button.
export default function ProjectArchiveIndex({ archiveNumber, isOpen, onToggle }) {
  return (
    <div className="project-archive-index">
      <button
        type="button"
        className="project-archive-index__button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen ? "Close project information" : "Open project information"
        }
      >
        <span className="project-archive-index__number">{`[${archiveNumber}]`}</span>
      </button>
    </div>
  );
}
