// Reuses the exact title/location typography AboutPage.jsx already
// established (.about-hero__title / .about-hero__location) -- the same
// restrained editorial pairing, just fed a Project's data instead of the
// studio's own.
//
// The title is now clickable: onTitleClick (wired by ProjectTemplate to
// resolveInitialImageId) returns the visitor to this project's hero image,
// quietly reinforcing that every project has an authored beginning. The
// <h1> stays the real heading for accessibility/SEO; the <button> inside
// it is a plain reset (.about-hero__title-button, in styles.css) that
// inherits the h1's own font/color, so this adds a click target without
// changing the typography AboutPage.jsx/ProjectsPage.jsx's own untouched
// <h1 className="about-hero__title"> still renders elsewhere.
export default function ProjectHeader({ project, onTitleClick }) {
  return (
    <div className="about-hero">
      <h1 className="about-hero__title">
        <button
          type="button"
          className="about-hero__title-button"
          onClick={onTitleClick}
        >
          {project.title}
        </button>
      </h1>
      {project.location && (
        <p className="about-hero__location">{project.location}</p>
      )}
    </div>
  );
}
