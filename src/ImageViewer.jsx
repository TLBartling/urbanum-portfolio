import { useEffect, useRef } from "react";
import ImageMetadata from "./ImageMetadata";

// The template's large image, its caption, and the sequence indicator --
// the three pieces that together read as "one image, within a project,
// within a sequence," in that order top to bottom. All three are
// deliberately quieter than Project Navigation (ProjectNavigation.jsx),
// the only control that ever changes which Project is loaded or leaves
// this page:
//
// 1. ImageMetadata renders as a plain caption directly beneath the frame
//    (sitting very close to it -- see styles.css) rather than as an
//    overlay on the photograph. Overlaying it never read reliably across
//    different photos (contrast is unpredictable), so it's back to
//    living on the page's own background, where its typography always
//    reads exactly the same regardless of what image is showing.
//
// 2. Below the caption, a numbered sequence indicator replaces the old
//    dots -- "01 02 [03] 04 05", current image bracketed -- framed by a
//    short rule on each side that hugs the numbers rather than
//    stretching toward the frame's edges. For a project with more images
//    than comfortably fit (see WINDOW_THRESHOLD/WINDOW_SIZE below), this
//    shows a sliding window centered on the current image with an
//    ellipsis marking whatever's hidden on either side, rather than
//    rendering every number -- it should read as looking through a
//    section of a larger archive, not as a full index.
//
// 3. The whole viewer also responds to a horizontal wheel/trackpad
//    gesture (see the effect below) by stepping to the next/previous
//    image -- the same horizontal-scroll-to-navigate language the
//    homepage gallery established, just implemented as discrete steps
//    through a fixed list rather than the homepage's continuous
//    physics-based track (there's no "distance" to travel here, only a
//    next/previous image). Checked against git history: this was never
//    present on the Project Page before -- there's nothing to restore,
//    this is new.
//
// Clicking a number, or stepping via wheel, both go through the same
// onSelectImage callback ProjectTemplate already uses to resolve the
// initial image from the URL -- no new state or routing behavior.
//
// No zoom here by design: the Project Page presents each image at a fixed
// viewing size. Zoom is reserved for the homepage gallery's own interaction
// language (.zoom-controls/.zoom-control in App.jsx) -- that markup/CSS is
// untouched by this file and was never imported from here.

// Projects with more images than this render a sliding window instead of
// every number. WINDOW_SIZE is odd so it can center evenly (3 before the
// current image, current, 3 after) when there's room on both sides.
const WINDOW_THRESHOLD = 9;
const WINDOW_SIZE = 7;

function getSequenceWindow(count, currentIndex) {
  if (count <= WINDOW_THRESHOLD) {
    return { start: 0, end: count - 1 };
  }
  const half = Math.floor((WINDOW_SIZE - 1) / 2);
  const maxStart = count - WINDOW_SIZE;
  const start = Math.min(Math.max(currentIndex - half, 0), maxStart);
  return { start, end: start + WINDOW_SIZE - 1 };
}

// How long to ignore further wheel input after stepping to a new image --
// a single trackpad swipe or Magic Mouse gesture fires many wheel events
// in quick succession, and without this it would blow through several
// images at once instead of reading as one deliberate step.
const WHEEL_STEP_COOLDOWN_MS = 450;

export default function ImageViewer({ image, images, onSelectImage }) {
  const currentIndex = images.findIndex(
    (item) => item.archiveNumber === image.archiveNumber,
  );
  const viewerRef = useRef(null);
  // -Infinity, not 0, so the very first wheel gesture right after mount is
  // never mistaken for "still in cooldown" (performance.now() could in
  // principle be a small number that early).
  const lastStepAtRef = useRef(-Infinity);

  useEffect(() => {
    const node = viewerRef.current;
    if (!node || images.length < 2) return undefined;

    const handleWheel = (event) => {
      // Only ever responds to a genuinely horizontal gesture -- a
      // trackpad two-finger swipe or Magic Mouse's own horizontal axis,
      // or Shift+wheel as the standard fallback for a plain mouse wheel
      // with no horizontal axis of its own. Ordinary vertical page
      // scrolling over the image is completely untouched.
      const horizontalDelta = event.shiftKey
        ? event.deltaY
        : Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : 0;

      if (horizontalDelta === 0) return;

      event.preventDefault();

      const now = performance.now();
      if (now - lastStepAtRef.current < WHEEL_STEP_COOLDOWN_MS) return;

      const target =
        horizontalDelta > 0
          ? currentIndex < images.length - 1
            ? images[currentIndex + 1]
            : null
          : currentIndex > 0
            ? images[currentIndex - 1]
            : null;

      if (!target) return;

      lastStepAtRef.current = now;
      onSelectImage(target.archiveNumber);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [currentIndex, images, onSelectImage]);

  const { start, end } = getSequenceWindow(images.length, currentIndex);
  const visibleImages = images.slice(start, end + 1);
  const showLeadingEllipsis = start > 0;
  const showTrailingEllipsis = end < images.length - 1;

  return (
    <div className="project-image-viewer" ref={viewerRef}>
      <div className="project-image-frame">
        <img
          className="project-image-frame__img"
          src={image.image}
          alt={image.title || image.caption || `Archive ${image.archiveNumber}`}
        />
      </div>

      <ImageMetadata image={image} />

      {images.length > 1 && (
        <div className="project-image-sequence" aria-label="Image sequence">
          <span className="project-image-sequence__rule" aria-hidden="true" />
          <div className="project-image-sequence__numbers">
            {showLeadingEllipsis && (
              <span
                className="project-image-sequence__ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            )}
            {visibleImages.map((item, offset) => {
              const position = start + offset;
              const isActive = position === currentIndex;
              const label = String(position + 1).padStart(2, "0");
              return (
                <button
                  key={item.archiveNumber}
                  type="button"
                  className={`project-image-sequence__number${
                    isActive ? " project-image-sequence__number--active" : ""
                  }`}
                  onClick={() => onSelectImage(item.archiveNumber)}
                  aria-label={`Go to image ${position + 1} of ${images.length}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {isActive ? `[${label}]` : label}
                </button>
              );
            })}
            {showTrailingEllipsis && (
              <span
                className="project-image-sequence__ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            )}
          </div>
          <span className="project-image-sequence__rule" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
