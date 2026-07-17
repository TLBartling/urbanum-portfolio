// Reuses the exact title/location typography AboutPage.jsx already
// established (.about-hero__title / .about-hero__location) -- the same
// restrained editorial pairing, just fed a Project's data instead of the
// studio's own. No new CSS needed for this piece.
export default function ProjectHeader({ project }) {
  return (
    <div className="about-hero">
      <h1 className="about-hero__title">{project.title}</h1>
      {project.location && (
        <p className="about-hero__location">{project.location}</p>
      )}
    </div>
  );
}
