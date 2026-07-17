import { useState } from "react";

// The template's large image, plus the two navigation affordances that
// live directly on it: zoom (visual only, affects this image alone), and
// Image Navigation -- moving to a different Archive Item within the same
// Project. Image Navigation is deliberately separate from Project
// Navigation (ProjectNavigation.jsx): it never changes which Project is
// loaded and never leaves this page, it only changes which image is
// current, via the same onSelectImage callback ProjectTemplate already
// uses to resolve the initial image from the URL.
//
// Zoom reuses the site's existing .zoom-controls/.zoom-control -- the same
// fixed bottom-center control already styled (and currently unwired) on
// the homepage gallery -- so this is the first place it actually does
// anything, not a new visual language.
//
// The prev/next image control here is a minimal, functional placeholder --
// arrows plus a plain count -- since neither the mockup nor the approved
// architecture specified a visual treatment for "continue exploring the
// remaining images" (a filmstrip, thumbnails, etc.). Worth a design pass
// before this is considered final.
const ZOOM_STEP = 0.2;
const MIN_ZOOM = 1;
const MAX_ZOOM = 1.6;

export default function ImageViewer({ image, images, onSelectImage }) {
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const currentIndex = images.findIndex(
    (item) => item.archiveNumber === image.archiveNumber,
  );
  const previousImage = currentIndex > 0 ? images[currentIndex - 1] : null;
  const nextImage =
    currentIndex < images.length - 1 ? images[currentIndex + 1] : null;

  const handleSelect = (target) => {
    if (!target) return;
    setZoom(MIN_ZOOM);
    onSelectImage(target.archiveNumber);
  };

  return (
    <div className="project-image-viewer">
      <div className="project-image-frame">
        <img
          className="project-image-frame__img"
          src={image.image}
          alt={image.title || image.caption || `Archive ${image.archiveNumber}`}
          style={{ transform: `scale(${zoom})` }}
        />
      </div>

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

      <div className="zoom-controls" aria-label="Zoom controls">
        <button
          type="button"
          className="zoom-control"
          aria-label="Zoom out"
          onClick={() =>
            setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))
          }
          disabled={zoom <= MIN_ZOOM}
        >
          -
        </button>
        <button
          type="button"
          className="zoom-control"
          aria-label="Zoom in"
          onClick={() =>
            setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))
          }
          disabled={zoom >= MAX_ZOOM}
        >
          +
        </button>
      </div>
    </div>
  );
}
