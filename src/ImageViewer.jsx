// The template's large image, plus the one navigation affordance that
// lives directly on it: Image Navigation -- moving to a different Archive
// Item within the same Project. Image Navigation is deliberately separate
// from Project Navigation (ProjectNavigation.jsx): it never changes which
// Project is loaded and never leaves this page, it only changes which
// image is current, via the same onSelectImage callback ProjectTemplate
// already uses to resolve the initial image from the URL.
//
// Zoom controls have been removed from this page (presentation-only
// change -- the image now simply displays at its designed presentation
// size). The shared .zoom-controls/.zoom-control CSS is left untouched,
// since the homepage gallery still owns those classes.
//
// The prev/next image control here is a minimal, functional placeholder --
// arrows plus a plain count -- since neither the mockup nor the approved
// architecture specified a visual treatment for "continue exploring the
// remaining images" (a filmstrip, thumbnails, etc.). Worth a design pass
// before this is considered final.
//
// Layout refinement: `caption` is an accepted-as-is ReactNode (ProjectTemplate
// passes its own <ImageMetadata/> straight through, unchanged) -- this
// component still doesn't know or care what's inside it, it only places it
// in .project-image-footer alongside the nav controls so the caption reads
// as directly attached to the image, in the same row as (not stacked below)
// the image-navigation controls. No metadata logic lives here; this is
// purely a slot.

export default function ImageViewer({ image, images, onSelectImage, caption }) {
  const currentIndex = images.findIndex(
    (item) => item.archiveNumber === image.archiveNumber,
  );
  const previousImage = currentIndex > 0 ? images[currentIndex - 1] : null;
  const nextImage =
    currentIndex < images.length - 1 ? images[currentIndex + 1] : null;

  const handleSelect = (target) => {
    if (!target) return;
    onSelectImage(target.archiveNumber);
  };

  return (
    <div className="project-image-viewer">
      <div className="project-image-frame">
        <img
          className="project-image-frame__img"
          src={image.image}
          alt={image.title || image.caption || `Archive ${image.archiveNumber}`}
        />
      </div>

      <div className="project-image-footer">
        {caption}
        {images.length > 1 && (
          <div className="project-image-nav" aria-label="Image navigation">
            <button
              type="button"
              className="project-image-nav__control"
              onClick={() => handleSelect(previousImage)}
              disabled={!previousImage}
              aria-label="Previous image"
            >
              ‹
            </button>
            <span className="project-image-nav__count">
              {currentIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              className="project-image-nav__control"
              onClick={() => handleSelect(nextImage)}
              disabled={!nextImage}
              aria-label="Next image"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
