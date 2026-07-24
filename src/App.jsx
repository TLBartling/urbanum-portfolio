import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import imageMetadata from "./image-metadata.json";
import Header from "./Header";
import HoverOverlay from "./HoverOverlay";
import { navigate } from "./navigation";
import { findArchiveItemBySrc } from "./mockArchiveItems";

export const allImages = [
  "/img/pexels-adrien-olichon-1257089-3137038.jpg",
  "/img/pexels-adrien-olichon-1257089-3137047.jpg",
  "/img/pexels-ai25studio-8837511.jpg",
  "/img/pexels-airamdphoto-27675599.jpg",
  "/img/pexels-andrea-238542097-35392198.jpg",
  "/img/pexels-artbovich-11701113.jpg",
  "/img/pexels-artbovich-7166645.jpg",
  "/img/pexels-artbovich-7195739.jpg",
  "/img/pexels-artbovich-8089093.jpg",
  "/img/pexels-costa-17729218.jpg",
  "/img/pexels-ezgi-arslanturk-karaman-48519538-11195363.jpg",
  "/img/pexels-francesco-ungaro-2058168.jpg",
  "/img/pexels-ganiyevart-15153700.jpg",
  "/img/pexels-googledeepmind-25626446.jpg",
  "/img/pexels-itskhalidkhan-6259182.jpg",
  "/img/pexels-ivan-s-4458200.jpg",
  "/img/pexels-ivan-s-4458205.jpg",
  "/img/pexels-jonas-horsch-102497290-34303572.jpg",
  "/img/pexels-laup-1816030.jpg",
  "/img/pexels-macit-abdullah-2152400408-33643463.jpg",
  "/img/pexels-magda-ehlers-pexels-35009410.jpg",
  "/img/pexels-perqued-10919427.jpg",
  "/img/pexels-perqued-9757618.jpg",
  "/img/pexels-pixels-elements-16627387.jpg",
  "/img/pexels-pth686817-20588914.jpg",
  "/img/pexels-rethaferguson-3825540.jpg",
  "/img/pexels-rushipatel1210-32654150.jpg",
  "/img/pexels-shvets-production-9052461.jpg",
  "/img/pexels-sliceisop-2739074.jpg",
  "/img/pexels-srcharls-35614239.jpg",
  "/img/pexels-thomas-parker-1272388137-31500951.jpg",
  "/img/pexels-tima-miroshnichenko-6615234.jpg",
  "/img/pexels-unlime-8262182.jpg",
  "/img/pexels-yunuserentk-10026713.jpg",
  "/img/pexels-zulfugarkarimov-33719839.jpg",
];

const imageTags = {
  "/img/pexels-adrien-olichon-1257089-3137038.jpg": "light",
  "/img/pexels-adrien-olichon-1257089-3137047.jpg": "light",
  "/img/pexels-ai25studio-8837511.jpg": "light",
  "/img/pexels-artbovich-11701113.jpg": "structure",
  "/img/pexels-artbovich-7166645.jpg": "structure",
  "/img/pexels-artbovich-7195739.jpg": "structure",
  "/img/pexels-artbovich-8089093.jpg": "structure",
};

const imageFocusEnabled = false;
const galleryBatchWidth = 1760;
const galleryEdgeBleed = 190;

// Real hand-built column compositions (extracted from the studio's own
// reference layout). Each pattern is a fixed column of tiles sharing the
// same render height; "left/top/w/h" are percentages of that column's own
// box, "orientation" is used to pick a matching real photo for the slot.
const COLUMN_PATTERNS = [{"aspect":0.557,"tiles":[{"left":33.858,"top":79.741,"w":16.535,"h":10.776,"orientation":"landscape"},{"left":62.598,"top":75.647,"w":35.039,"h":18.966,"orientation":"landscape"},{"left":0.0,"top":55.172,"w":32.677,"h":18.534,"orientation":"landscape"},{"left":38.189,"top":54.741,"w":59.449,"h":18.966,"orientation":"landscape"},{"left":84.252,"top":49.353,"w":13.386,"h":3.017,"orientation":"landscape"},{"left":62.598,"top":48.06,"w":12.047,"h":5.043,"orientation":"landscape"},{"left":37.431,"top":42.466,"w":16.535,"h":10.776,"orientation":"landscape"},{"left":17.323,"top":42.888,"w":17.323,"h":10.56,"orientation":"landscape"},{"left":84.252,"top":38.793,"w":13.386,"h":5.172,"orientation":"landscape"},{"left":56.693,"top":35.56,"w":19.291,"h":10.991,"orientation":"landscape"},{"left":62.598,"top":29.53,"w":13.386,"h":4.526,"orientation":"landscape"},{"left":84.252,"top":29.095,"w":13.386,"h":5.819,"orientation":"landscape"},{"left":62.598,"top":11.207,"w":37.402,"h":15.948,"orientation":"landscape"},{"left":62.598,"top":2.155,"w":13.386,"h":3.233,"orientation":"landscape"},{"left":12.205,"top":2.155,"w":45.276,"h":31.681,"orientation":"landscape"},{"left":84.252,"top":1.509,"w":13.386,"h":4.31,"orientation":"landscape"}]},{"aspect":1.0696,"tiles":[{"left":46.479,"top":82.328,"w":17.304,"h":9.483,"orientation":"landscape"},{"left":27.968,"top":76.293,"w":16.901,"h":23.707,"orientation":"portrait"},{"left":71.429,"top":71.767,"w":25.352,"h":19.828,"orientation":"landscape"},{"left":0.805,"top":69.612,"w":18.913,"h":17.241,"orientation":"square"},{"left":1.408,"top":62.716,"w":6.841,"h":4.741,"orientation":"landscape"},{"left":12.475,"top":62.284,"w":6.841,"h":5.388,"orientation":"landscape"},{"left":23.541,"top":59.698,"w":21.127,"h":14.44,"orientation":"landscape"},{"left":34.608,"top":53.861,"w":6.157,"h":4.461,"orientation":"landscape"},{"left":46.282,"top":52.155,"w":17.706,"h":25.862,"orientation":"portrait"},{"left":65.392,"top":50.862,"w":31.791,"h":18.75,"orientation":"landscape"},{"left":89.94,"top":43.966,"w":6.841,"h":4.31,"orientation":"landscape"},{"left":78.873,"top":43.966,"w":6.841,"h":4.31,"orientation":"landscape"},{"left":34.809,"top":42.883,"w":7.646,"h":9.483,"orientation":"portrait"},{"left":46.278,"top":42.879,"w":5.634,"h":7.328,"orientation":"portrait"},{"left":14.487,"top":42.879,"w":17.565,"h":13.965,"orientation":"landscape"},{"left":0.402,"top":40.948,"w":12.475,"h":18.75,"orientation":"portrait"},{"left":90.137,"top":34.483,"w":6.841,"h":4.526,"orientation":"landscape"},{"left":1.207,"top":34.483,"w":7.042,"h":4.526,"orientation":"landscape"},{"left":12.475,"top":34.052,"w":6.841,"h":5.388,"orientation":"landscape"},{"left":56.942,"top":33.621,"w":17.706,"h":15.302,"orientation":"landscape"},{"left":90.137,"top":24.784,"w":6.841,"h":4.957,"orientation":"landscape"},{"left":56.74,"top":24.784,"w":6.841,"h":4.957,"orientation":"landscape"},{"left":12.475,"top":24.784,"w":6.841,"h":4.957,"orientation":"landscape"},{"left":67.61,"top":24.569,"w":7.042,"h":5.603,"orientation":"landscape"},{"left":76.056,"top":24.353,"w":12.676,"h":17.026,"orientation":"portrait"},{"left":1.207,"top":24.353,"w":7.042,"h":6.034,"orientation":"landscape"},{"left":13.682,"top":1.207,"w":5.835,"h":4.526,"orientation":"landscape"},{"left":93.352,"top":16.164,"w":7.042,"h":5.388,"orientation":"landscape"},{"left":56.74,"top":15.733,"w":6.841,"h":4.31,"orientation":"landscape"},{"left":21.932,"top":15.086,"w":32.193,"h":26.293,"orientation":"landscape"},{"left":93.352,"top":7.328,"w":7.042,"h":4.31,"orientation":"landscape"},{"left":65.392,"top":7.328,"w":26.559,"h":14.44,"orientation":"landscape"},{"left":0.805,"top":7.112,"w":18.913,"h":14.224,"orientation":"landscape"},{"left":23.541,"top":6.466,"w":6.841,"h":4.31,"orientation":"landscape"},{"left":57.344,"top":4.741,"w":5.634,"h":7.543,"orientation":"portrait"},{"left":46.68,"top":4.741,"w":4.628,"h":7.543,"orientation":"portrait"},{"left":35.01,"top":0.0,"w":9.256,"h":12.284,"orientation":"portrait"}]},{"aspect":0.808,"tiles":[{"left":24.665,"top":86.638,"w":16.086,"h":6.25,"orientation":"landscape"},{"left":1.877,"top":86.638,"w":16.354,"h":6.466,"orientation":"landscape"},{"left":77.748,"top":86.422,"w":14.477,"h":6.681,"orientation":"landscape"},{"left":94.37,"top":84.483,"w":5.63,"h":8.405,"orientation":"portrait"},{"left":78.016,"top":72.845,"w":21.984,"h":9.914,"orientation":"landscape"},{"left":45.308,"top":72.845,"w":29.491,"h":24.569,"orientation":"landscape"},{"left":24.933,"top":72.845,"w":15.818,"h":7.543,"orientation":"landscape"},{"left":1.877,"top":72.629,"w":16.354,"h":7.974,"orientation":"landscape"},{"left":45.576,"top":63.578,"w":9.383,"h":5.388,"orientation":"landscape"},{"left":60.322,"top":63.362,"w":9.383,"h":5.819,"orientation":"landscape"},{"left":45.591,"top":43.966,"w":27.078,"h":16.379,"orientation":"landscape"},{"left":74.531,"top":36.638,"w":24.129,"h":31.034,"orientation":"portrait"},{"left":45.576,"top":36.207,"w":9.115,"h":3.664,"orientation":"landscape"},{"left":60.322,"top":35.129,"w":9.115,"h":5.819,"orientation":"landscape"},{"left":1.34,"top":34.483,"w":39.678,"h":35.56,"orientation":"square"},{"left":1.34,"top":26.509,"w":9.115,"h":4.31,"orientation":"landscape"},{"left":30.831,"top":25.862,"w":9.115,"h":5.603,"orientation":"landscape"},{"left":16.086,"top":25.862,"w":9.115,"h":5.603,"orientation":"landscape"},{"left":31.099,"top":17.241,"w":8.847,"h":4.095,"orientation":"landscape"},{"left":45.308,"top":16.379,"w":45.576,"h":16.81,"orientation":"landscape"},{"left":45.576,"top":7.543,"w":9.383,"h":4.526,"orientation":"landscape"},{"left":30.831,"top":7.112,"w":9.115,"h":5.603,"orientation":"landscape"},{"left":60.858,"top":6.25,"w":8.043,"h":7.328,"orientation":"square"},{"left":74.263,"top":5.388,"w":18.231,"h":7.974,"orientation":"landscape"},{"left":1.34,"top":1.94,"w":23.861,"h":21.121,"orientation":"square"}]},{"aspect":0.3523,"tiles":[{"left":0.0,"top":87.5,"w":21.656,"h":5.603,"orientation":"landscape"},{"left":0.0,"top":78.879,"w":21.656,"h":4.095,"orientation":"landscape"},{"left":35.032,"top":76.94,"w":57.325,"h":21.336,"orientation":"landscape"},{"left":70.064,"top":69.397,"w":22.293,"h":4.31,"orientation":"landscape"},{"left":35.032,"top":68.75,"w":22.293,"h":5.388,"orientation":"landscape"},{"left":0.0,"top":68.75,"w":21.656,"h":5.388,"orientation":"landscape"},{"left":0.0,"top":30.172,"w":92.357,"h":35.56,"orientation":"landscape"},{"left":52.229,"top":19.612,"w":38.217,"h":7.974,"orientation":"landscape"},{"left":0.0,"top":19.612,"w":36.306,"h":7.759,"orientation":"landscape"},{"left":52.229,"top":7.112,"w":38.217,"h":6.25,"orientation":"landscape"},{"left":0.0,"top":7.112,"w":36.306,"h":6.25,"orientation":"landscape"}]},{"aspect":0.711,"tiles":[{"left":35.78,"top":89.44,"w":10.398,"h":4.095,"orientation":"landscape"},{"left":70.948,"top":87.931,"w":7.034,"h":7.328,"orientation":"square"},{"left":53.211,"top":87.931,"w":14.067,"h":12.069,"orientation":"landscape"},{"left":87.156,"top":87.716,"w":8.563,"h":7.543,"orientation":"square"},{"left":86.239,"top":79.957,"w":10.398,"h":4.31,"orientation":"landscape"},{"left":1.223,"top":78.233,"w":28.746,"h":14.655,"orientation":"landscape"},{"left":86.239,"top":70.259,"w":10.398,"h":4.957,"orientation":"landscape"},{"left":18.96,"top":70.259,"w":10.092,"h":4.957,"orientation":"landscape"},{"left":1.835,"top":69.612,"w":10.398,"h":6.25,"orientation":"landscape"},{"left":1.835,"top":60.991,"w":10.398,"h":4.741,"orientation":"landscape"},{"left":18.96,"top":60.776,"w":10.398,"h":5.172,"orientation":"landscape"},{"left":33.333,"top":58.621,"w":48.93,"h":26.509,"orientation":"landscape"},{"left":86.239,"top":51.078,"w":13.15,"h":15.302,"orientation":"portrait"},{"left":70.336,"top":50.009,"w":8.563,"h":7.112,"orientation":"landscape"},{"left":52.905,"top":47.638,"w":11.315,"h":9.483,"orientation":"landscape"},{"left":21.713,"top":42.241,"w":26.972,"h":13.772,"orientation":"landscape"},{"left":52.599,"top":42.026,"w":8.838,"h":4.213,"orientation":"landscape"},{"left":0.612,"top":40.517,"w":18.96,"h":18.75,"orientation":"square"},{"left":18.96,"top":32.543,"w":10.398,"h":5.172,"orientation":"landscape"},{"left":1.835,"top":32.543,"w":10.398,"h":4.957,"orientation":"landscape"},{"left":35.474,"top":25.862,"w":32.416,"h":14.655,"orientation":"landscape"},{"left":70.642,"top":21.983,"w":26.911,"h":26.078,"orientation":"square"},{"left":1.223,"top":13.362,"w":28.746,"h":17.241,"orientation":"landscape"},{"left":70.642,"top":8.405,"w":25.994,"h":9.267,"orientation":"landscape"},{"left":7.951,"top":1.293,"w":26.606,"h":9.698,"orientation":"landscape"},{"left":42.508,"top":0.0,"w":25.688,"h":23.922,"orientation":"square"}]},{"aspect":0.5696,"tiles":[{"left":60.769,"top":94.828,"w":13.077,"h":3.233,"orientation":"landscape"},{"left":81.923,"top":94.181,"w":13.077,"h":4.31,"orientation":"landscape"},{"left":60.769,"top":72.845,"w":37.692,"h":15.948,"orientation":"landscape"},{"left":11.538,"top":66.164,"w":44.231,"h":31.897,"orientation":"landscape"},{"left":60.769,"top":65.948,"w":13.077,"h":4.31,"orientation":"landscape"},{"left":81.923,"top":65.302,"w":13.077,"h":5.603,"orientation":"landscape"},{"left":81.923,"top":56.034,"w":13.462,"h":5.388,"orientation":"landscape"},{"left":55.0,"top":53.664,"w":18.846,"h":10.776,"orientation":"landscape"},{"left":81.923,"top":47.845,"w":13.077,"h":3.017,"orientation":"landscape"},{"left":60.769,"top":46.763,"w":11.769,"h":5.043,"orientation":"landscape"},{"left":36.182,"top":46.974,"w":16.154,"h":10.776,"orientation":"landscape"},{"left":16.538,"top":46.552,"w":16.923,"h":10.776,"orientation":"landscape"},{"left":36.923,"top":26.509,"w":58.077,"h":18.75,"orientation":"landscape"},{"left":0.0,"top":26.509,"w":31.538,"h":18.534,"orientation":"landscape"},{"left":8.462,"top":6.034,"w":42.308,"h":15.733,"orientation":"landscape"},{"left":60.769,"top":5.388,"w":34.231,"h":18.966,"orientation":"landscape"}]}];

// Gap between adjacent pattern columns, as a percentage of the rendered
// column height. Originally set to the median internal gap measured across
// all 6 patterns (1.94%); nudged down slightly toward the tighter end of
// that same measured range (min 1.38%, p10 1.50%) so the pattern-to-pattern
// seam doesn't read as a wider, more obvious negative-space line than the
// gaps within a pattern.
const SEAM_GAP_PCT = 1.5;

// Guard window for logo-triggered regeneration (see handleLogoClick below):
// how long to ignore repeat clicks after a regeneration starts, so a burst
// of clicks reads as one deliberate action rather than several queued
// regenerations. Sized to the worst-case entrance-settle time of a freshly
// regenerated gallery -- item.motion.duration (0.72-1.08s, see
// getRandomImageMotion) plus up to ~0.42s of initial-reveal stagger plus up
// to ~0.08s of motion.delay -- with a small buffer rounded up.
const GALLERY_REGENERATION_SETTLE_MS = 1600;

// How long handleExitFocus's own defocus timeline takes to finish (matches
// its `defaults: { duration: 0.45, ... }`) -- used to delay a logo-triggered
// regeneration until the exit-focus animation has actually completed.
const EXIT_FOCUS_DURATION_MS = 450;

// Matches Header.jsx's own VEIL_DURATION_MS (520ms, var(--reveal-ease)) --
// the same motion vocabulary already used for the Filter/Search
// return-to-homepage veil, reused here so a logo-triggered regeneration
// reads as the gallery track quietly settling into a new composition
// rather than a hard cut. See the .gallery-track.is-regenerating rule in
// styles.css.
const GALLERY_FADE_MS = 520;

const clusterPlacements = [
  { axis: "x", direction: -1, distance: 1.08, scale: 0.38 },
  { axis: "x", direction: 1, distance: 1.08, scale: 0.38 },
  { axis: "y", direction: -1, distance: 0.96, scale: 0.34 },
  { axis: "y", direction: 1, distance: 0.96, scale: 0.34 },
  { axis: "x", direction: -1, distance: 1.42, scale: 0.3 },
  { axis: "x", direction: 1, distance: 1.42, scale: 0.3 },
];

const connectorTimings = [
  { duration: 1.28, delay: 0.1 },
  { duration: 1.62, delay: 0.28 },
  { duration: 1.08, delay: 0.18 },
  { duration: 1.83, delay: 0.38 },
  { duration: 1.44, delay: 0.24 },
  { duration: 1.71, delay: 0.46 },
];

const viewportMargin = 28;
const initialGalleryBatches = 3;
const optimizedImageWidths = [400, 800, 1200];
const minRenderOverscan = 1200;
const maxRenderOverscan = 3600;

// Camera Phase 1: discrete, un-eased zoom step wired to the existing +/-
// controls (see handleZoomStep in App()). No easing, cursor-anchoring, or
// inertia -- a click just moves viewportScaleRef.current by one step,
// clamped to this range. Chosen so the four values this milestone is
// verified against (0.75, 1, 1.5, 2) all land exactly on a step boundary
// starting from the default of 1.
const CAMERA_ZOOM_STEP = 0.25;
const CAMERA_ZOOM_MIN = 0.5;
const CAMERA_ZOOM_MAX = 2.5;

// Camera Phase 2: converts a single wheel event's deltaY into a scale
// delta, fed straight into the same handleZoomStep used by the buttons --
// same clamp, same range, no separate smoothing layer. Continuous rather
// than a fixed step (unlike CAMERA_ZOOM_STEP) because that's what makes
// wheel/trackpad zoom feel native; it's still a single, immediate,
// un-eased assignment per event, not smoothing. A plain default, easy to
// retune.
const CAMERA_ZOOM_WHEEL_SENSITIVITY = 0.01;

// Camera state/control split: Camera owns scale + pan, but does not decide
// when they should return to default -- that decision belongs to whatever
// higher-level behavior is generating a new gallery world (see
// resetCameraToNeutral / regenerateGallery in App()). These are simply the
// Camera's own default values, same ones the refs below are initialized to.
const CAMERA_NEUTRAL_SCALE = 1;
const CAMERA_NEUTRAL_PAN = 0;

function getImageName(src) {
  return src.split("/").pop()?.replace(/\.[^.]+$/, "") || "";
}

function getOptimizedImageSrc(src, width = 800, extension = "jpg") {
  return `/img/optimized/${width}/${getImageName(src)}.${extension}`;
}

function getOptimizedImageSrcSet(src, extension) {
  return optimizedImageWidths
    .map((width) => `${getOptimizedImageSrc(src, width, extension)} ${width}w`)
    .join(", ");
}

function getGalleryImageSizes(layout) {
  const width = Math.ceil(Number.parseFloat(layout.width));

  return `${width}px`;
}

function getImageDimensions(src) {
  return imageMetadata[src] || { width: 1200, height: 800 };
}

function shouldEagerLoadImage(item) {
  const itemIndex = Number(item.id.split("-")[1] || 0);
  return item.batchIndex === 0 && itemIndex < 12;
}

function getGalleryRenderWindow(distance = 0) {
  const viewportWidth =
    typeof window === "undefined" ? 1200 : window.innerWidth;
  const overscan = clamp(
    viewportWidth * 2.4,
    minRenderOverscan,
    maxRenderOverscan,
  );

  return {
    left: Math.max(0, distance - overscan),
    right: distance + viewportWidth + overscan,
  };
}

function isItemInRenderWindow(item, renderWindow) {
  const left = Number.parseFloat(item.layout.left);
  const right = left + Number.parseFloat(item.layout.width);

  return right >= renderWindow.left && left <= renderWindow.right;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getImageOrientation(src) {
  const ratio = imageMetadata[src]?.aspectRatio ?? 1;

  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

// Static grouping of every image by orientation -- computed once, at module
// load, since allImages/getImageOrientation never change. Used by
// pickImage() below to refill an exhausted bag.
const imagesByOrientation = { landscape: [], portrait: [], square: [] };
allImages.forEach((src) => {
  imagesByOrientation[getImageOrientation(src)].push(src);
});

// A self-refilling, per-orientation shuffled "bag" of real photos so
// consecutive draws of the same orientation don't repeat until the bag is
// exhausted and reshuffled. Falls back to the full image list for an
// orientation bucket that has no members.
//
// REFACTORED (extension-pipeline fix): this used to be a stateful object
// (`createImagePicker()`) whose `.next()` method mutated a private `bags`
// object in place. That mutation was one of the side effects that made
// createGalleryBatch() unsafe to call from inside a React state updater --
// see createGalleryBatch's own comment for the full picture. It's now a
// plain, immutable data shape (`{ bags }`) plus a pure function, pickImage,
// that never mutates its `pickerState` argument or anything reachable from
// it -- it returns a brand new pickerState instead. shuffleArray already
// returns a new array rather than mutating its input, so nothing here
// mutates anything shared.
function createImagePickerState() {
  return { bags: { landscape: [], portrait: [], square: [] } };
}

// PURE: given a pickerState and an orientation, returns { src,
// nextPickerState }. Draws from the end of the current bag for that
// orientation (equivalent to the old bags[orientation].pop()), refilling
// with a freshly shuffled bag first if the current one is empty.
function pickImage(pickerState, orientation) {
  let bag = pickerState.bags[orientation];

  if (bag.length === 0) {
    const source = imagesByOrientation[orientation].length
      ? imagesByOrientation[orientation]
      : allImages;
    bag = shuffleArray(source);
  }

  const src = bag[bag.length - 1];
  const nextPickerState = {
    bags: { ...pickerState.bags, [orientation]: bag.slice(0, -1) },
  };

  return { src, nextPickerState };
}

// --- Application Layout ---------------------------------------------------
// Owns page composition: how much room the header and the bottom controls
// need, and therefore where the gallery's viewing-window opening sits on
// the page (top/bottom) and how tall it is (height). Nothing downstream --
// Archive, Gallery Renderer -- needs to know header/footer clearance
// exists as a concept; they only ever receive plain numbers from here.
// This function knows nothing about images, patterns, distance, or scale.
function getViewportOpeningGeometry() {
  const viewportHeight =
    typeof window === "undefined" ? 800 : window.innerHeight;
  const viewportWidth =
    typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportPadding = Math.round(
    Math.min(Math.max(viewportHeight * 0.05, 18), 52),
  );
  const isCompactViewport = viewportWidth < 1000 || viewportHeight < 760;
  const headerClearance = Math.round(
    isCompactViewport
      ? clamp(viewportHeight * 0.14, 105, 145)
      : clamp(viewportHeight * 0.1, 95, 125),
  );
  const top = Math.max(viewportPadding, headerClearance);
  const bottomControlClearance = Math.round(
    isCompactViewport
      ? clamp(viewportHeight * 0.14, 105, 145)
      : clamp(viewportHeight * 0.1, 95, 125),
  );
  const bottom = Math.max(viewportPadding, bottomControlClearance);
  const height = Math.max(80, viewportHeight - top - bottom);

  return { top, bottom, height };
}

function getRandomOpacity() {
  return 1;
}

function getRandomImageMotion() {
  return {
    duration: Number(getRandomBetween(0.72, 1.08).toFixed(2)),
    delay: Number(getRandomBetween(0, 0.08).toFixed(2)),
  };
}

// Logical state threaded across every createGalleryBatch call for the life
// of the gallery: where the next column starts (cursorX), which pattern was
// used last (so it isn't immediately repeated), and the shuffled
// per-orientation photo bags. This is an explicit cursor rather than a
// derived value, so there's no collision search needed -- each pattern is
// pre-validated to have zero internal overlaps, so patterns can simply be
// placed edge-to-edge with one calibrated seam gap.
//
// REFACTORED (extension-pipeline fix): this is now plain, immutable data.
// Nothing in this file mutates a columnState object in place anymore --
// createGalleryBatch() (below) takes one as input and returns a brand new
// one as part of its result instead. See createGalleryBatch's comment for
// why that matters.
function createColumnState() {
  return {
    cursorX: -galleryEdgeBleed,
    lastPatternIndex: -1,
    pickerState: createImagePickerState(),
    // TEMPORARY DIAGNOSTIC (reversible) -- a persistent, globally-sequential
    // module counter, threaded across every createGalleryBatch call exactly
    // like cursorX already is. Gives every module (column) a stable,
    // comparable identity across batches/extensions so a gap-tracing tool
    // can tell "consecutive modules with an abnormal cursor jump between
    // them" apart from "a real break in the module sequence itself."
    moduleIndex: 0,
  };
}

// PURE: does not mutate anything. Given the pattern used last time, returns
// the next pattern index to use. The caller is responsible for carrying the
// returned value forward as the new "last pattern index".
function pickPatternIndex(lastPatternIndex) {
  const candidates = COLUMN_PATTERNS.map((_, index) => index).filter(
    (index) => index !== lastPatternIndex,
  );

  return candidates[Math.floor(Math.random() * candidates.length)];
}

// REFACTORED (extension-pipeline fix): createGalleryBatch is now a pure
// function. It used to take a mutable `state` object and mutate
// state.cursorX / state.moduleIndex / state.lastPatternIndex / state.picker
// in place as it ran -- and it was being called from directly inside a
// setGalleryItems(currentItems => ...) updater. React is explicitly allowed
// to invoke an updater function more than once for a single state update
// (deliberately, in development, to help surface exactly this kind of bug;
// and, as traced this round with window.__extendCallTrace /
// window.__setGalleryItemsTrace / window.__analyzeExtensionLifecycle(),
// also happening in practice well beyond just that immediate double-check).
// Every extra invocation was performing another real, permanent mutation of
// the shared columnState -- advancing the cursor and module counter again --
// regardless of whether that particular invocation's returned items ever
// ended up in the committed galleryItems. That is what produced everything
// this investigation traced back to: the duplicate moduleIndex 27/28 (two
// invocations, two different starting cursor positions), and the modules
// that were generated correctly but never appeared in galleryItems (an
// invocation whose mutation stuck, but whose returned batch was the one
// discarded).
//
// The fix: this function no longer mutates its `columnState` argument or
// anything reachable from it (pickPatternIndex and pickImage, both used
// below, are pure for the same reason). It returns the batch's items AND a
// brand new columnState reflecting the advance, instead of mutating one in
// place. The one remaining non-purity is the same Math.random()-driven
// pattern/image selection this generator always had -- that's an
// intentional design property (real visual variety), not a side effect.
// worldCanvasHeight is a plain number -- how tall Archive's own canvas is,
// supplied by the caller. This function never asks why it's that size and
// never touches Application Layout's geometry function; that's the whole
// point of the ownership boundary.
function createGalleryBatch(batchIndex, columnState, worldCanvasHeight) {
  const seamGapPx = (SEAM_GAP_PCT / 100) * worldCanvasHeight;
  const viewportWidth =
    typeof window === "undefined" ? 1200 : window.innerWidth;
  const targetBatchWidth = clamp(
    viewportWidth * 1.35,
    900,
    galleryBatchWidth,
  );
  const batchStartX = columnState.cursorX;
  const items = [];
  let itemIndex = 0;
  let moduleCount = 0; // TEMPORARY VISUAL DEBUG MODE -- one column == one procedural module

  // Local, function-scoped working values -- these are what would have been
  // `state.cursorX` etc. before the refactor. They're reassigned as the loop
  // runs, but nothing outside this function call can observe or be affected
  // by that, since they're plain local bindings, not the caller's object.
  let cursorX = columnState.cursorX;
  let lastPatternIndex = columnState.lastPatternIndex;
  let pickerState = columnState.pickerState;
  let moduleIndex = columnState.moduleIndex;

  while (cursorX - batchStartX < targetBatchWidth) {
    const patternIndex = pickPatternIndex(lastPatternIndex);
    lastPatternIndex = patternIndex;
    const pattern = COLUMN_PATTERNS[patternIndex];
    const columnLeft = cursorX;
    const columnWidthPx = pattern.aspect * worldCanvasHeight;
    // TEMPORARY DIAGNOSTIC (reversible) -- see createColumnState's
    // moduleIndex comment. Captured once per column/module, before the
    // cursor advances, so every tile in this column shares the same value.
    const thisModuleIndex = moduleIndex;
    moduleIndex += 1;
    moduleCount += 1;

    pattern.tiles.forEach((tile) => {
      const { src, nextPickerState } = pickImage(pickerState, tile.orientation);
      pickerState = nextPickerState;
      const width = (tile.w / 100) * columnWidthPx;
      const height = (tile.h / 100) * worldCanvasHeight;
      const left = columnLeft + (tile.left / 100) * columnWidthPx;
      // World-origin relative -- no frame offset added. This tile's
      // vertical position is purely "where within my own canvas," never
      // "where on the page." Application Layout, not Archive, is
      // responsible for where that canvas is placed on the page.
      const top = (tile.top / 100) * worldCanvasHeight;

      // Homepage -> Project navigation: an image only becomes clickable
      // (below, in the render) if it's also a mock Archive Item that
      // belongs to a Project -- most of these 34 stock photos aren't, and
      // stay exactly as inert as they are today. archiveItem is null for
      // those, and the fields below just carry that through.
      const archiveItem = findArchiveItemBySrc(src);

      items.push({
        id: `${batchIndex}-${itemIndex}`,
        batchIndex,
        // TEMPORARY DIAGNOSTIC (reversible) -- see moduleIndex above.
        moduleIndex: thisModuleIndex,
        patternIndex,
        src,
        alt: `Gallery image ${itemIndex + 1}`,
        layout: {
          width: `${Math.round(width)}px`,
          height: `${Math.round(height)}px`,
          left: `${Math.round(left)}px`,
          top: `${Math.round(top)}px`,
          relationshipMotion: null,
          zIndex: Math.round(getRandomBetween(1, 12)),
        },
        opacity: getRandomOpacity(),
        tag: imageTags[src] || null,
        archiveNumber: archiveItem?.archiveNumber ?? null,
        project: archiveItem?.project ?? null,
        // Prototype Data Contract (Commit 2.5): carry the Archive Item's
        // own theme/tags onto the gallery item alongside the
        // archiveNumber/project fields already carried above -- same
        // null-safe pattern, same source (mockArchiveItems.js via
        // archiveItem, looked up above by findArchiveItemBySrc). This adds
        // data fields only; it does not change any procedural
        // geometry/randomization this function already performs. Distinct
        // from the pre-existing singular `tag` field above, which comes
        // from the unrelated imageTags map and is untouched.
        theme: archiveItem?.theme ?? null,
        // HoverOverlay wiring fix: mockArchiveItems.js (Commit 3.5) already
        // carries a plural `themes` array (2-3 entries) per Archive Item,
        // but this function was only ever carrying the singular `theme`
        // through to the gallery item -- so `item.themes` was always
        // undefined here, no matter how rich the mock data got. Carried
        // the same null-safe way as theme/tags; `theme` itself is
        // untouched, still the same value as before, for the JSX fallback
        // below and any other existing reader.
        themes: archiveItem?.themes ?? [],
        tags: archiveItem?.tags ?? [],
        motion: getRandomImageMotion(),
      });

      itemIndex += 1;
    });

    const expectedNextCursor = columnLeft + columnWidthPx + seamGapPx;
    cursorX = expectedNextCursor;
  }

  return {
    items,
    nextColumnState: { cursorX, lastPatternIndex, pickerState, moduleIndex },
    // TEMPORARY VISUAL DEBUG MODE -- returned instead of written to a
    // window side-channel, since this function's caller now always has
    // these values in hand synchronously (createGalleryBatch no longer runs
    // inside anything replayable, so there's no need for an out-of-band
    // channel to survive a re-invocation).
    moduleCount,
    batchStartX,
  };
}

// REFACTORED (extension-pipeline fix): threads columnState through each
// sequential batch explicitly (createGalleryBatch no longer mutates it),
// returning both the combined items and the final columnState after all
// batchCount batches -- the caller (the mount/resize effects) is
// responsible for storing that final columnState as the new starting point
// for future extensions.
function buildGalleryItems(
  columnState,
  batchCount = initialGalleryBatches,
  worldCanvasHeight,
) {
  let state = columnState;
  const allItems = [];

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const { items, nextColumnState } = createGalleryBatch(
      batchIndex,
      state,
      worldCanvasHeight,
    );
    allItems.push(...items);
    state = nextColumnState;
  }

  return { items: allItems, nextColumnState: state };
}

function getGalleryTrackWidth(items) {
  const contentWidth = items.reduce((maxRight, item) => {
    const left = Number.parseFloat(item.layout.left);
    const width = Number.parseFloat(item.layout.width);

    return Math.max(maxRight, left + width);
  }, 0);

  const viewportWidth =
    typeof window === "undefined" ? 1200 : window.innerWidth;

  return Math.ceil(contentWidth + viewportWidth);
}

function getNextGalleryBatchIndex(items) {
  if (items.length === 0) return 0;

  return Math.max(...items.map((item) => item.batchIndex)) + 1;
}

function clamp(value, min, max) {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

function getClusterCenter(placement, focusedRect, relatedRect) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const visualFocusedWidth = focusedRect.width * 1.08;
  const visualFocusedHeight = focusedRect.height * 1.08;
  const relatedWidth = relatedRect.width * placement.scale;
  const relatedHeight = relatedRect.height * placement.scale;
  const minX = viewportMargin + relatedWidth / 2;
  const maxX = window.innerWidth - viewportMargin - relatedWidth / 2;
  const minY = viewportMargin + relatedHeight / 2;
  const maxY = window.innerHeight - viewportMargin - relatedHeight / 2;

  if (placement.axis === "x") {
    return {
      x: clamp(
        centerX + visualFocusedWidth * placement.distance * placement.direction,
        minX,
        maxX,
      ),
      y: clamp(centerY, minY, maxY),
    };
  }

  return {
    x: clamp(centerX, minX, maxX),
    y: clamp(
      centerY + visualFocusedHeight * placement.distance * placement.direction,
      minY,
      maxY,
    ),
  };
}

function getClusterConnector(item, index, focusedRect) {
  const placement = clusterPlacements[index % clusterPlacements.length];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const relatedCenter = getClusterCenter(placement, focusedRect, item.rect);
  const focusedHalfWidth = (focusedRect.width * 1.08) / 2;
  const focusedHalfHeight = (focusedRect.height * 1.08) / 2;
  const relatedHalfWidth = (item.rect.width * placement.scale) / 2;
  const relatedHalfHeight = (item.rect.height * placement.scale) / 2;

  if (placement.axis === "x") {
    const startX = centerX + focusedHalfWidth * placement.direction;
    const endX = relatedCenter.x - relatedHalfWidth * placement.direction;

    return {
      id: item.id,
      x1: startX,
      y1: centerY,
      x2: endX,
      y2: centerY,
    };
  }

  return {
    id: item.id,
    x1: centerX,
    y1: centerY + focusedHalfHeight * placement.direction,
    x2: centerX,
    y2: relatedCenter.y - relatedHalfHeight * placement.direction,
  };
}

// --- Renderer -------------------------------------------------------------
// Per the ownership model adopted this milestone (Archive / Navigator /
// Camera / Renderer / Interaction), the Renderer is the single owner of
// every DOM write associated with the gallery track's presentation: the
// transform that positions the track, the per-item entrance-reveal
// animation, and the virtualization window that decides which
// already-generated items are close enough to mount. It receives
// world-space state (movement, galleryItems) and Camera state
// (viewportScaleRef) as plain inputs -- it owns no state beyond the DOM
// refs/closures it needs to perform its own writes, it never requests
// archive generation, and it never reads archive internals beyond the
// layout each item already carries.
//
// viewportScaleRef.current now drives the actual projection math below
// (projectWorldToScreenX, getVerticalScaleCompensation, applyTransform) --
// as of Camera Phase 1, it's a real, user-controlled value (see
// handleZoomStep in App()), not the fixed 1.5 verification constant or the
// unread placeholder this comment used to describe.
function createGalleryRenderer({
  track,
  wrapperById,
  animatedImages,
  movement,
  viewportScaleRef,
  viewportPanXRef,
  renderWindowRef,
  setRenderWindowState,
  focusedIdRef,
  preEntryDistance,
  renderWindowUpdateThreshold,
  openingHeight,
}) {
  const setTrackX = gsap.quickSetter(track, "x", "px");
  const setTrackY = gsap.quickSetter(track, "y", "px");
  // Separate scaleX/scaleY quickSetters, not a single "scale" one --
  // gsap.quickSetter(track, "scale") throws InvalidCharacterError against
  // this element, the same issue hit and worked around earlier in this
  // rebuild.
  const setTrackScaleX = gsap.quickSetter(track, "scaleX");
  const setTrackScaleY = gsap.quickSetter(track, "scaleY");

  // The single horizontal world->screen projection path. Every horizontal
  // screen-space position the Gallery Renderer produces -- the track's own
  // transform, each item's entrance-animation position -- must be derived
  // by calling this, not by re-deriving the relationship independently.
  // Anchored on the viewport's own center rather than the world's
  // coordinate origin: whatever world position currently sits at
  // window.innerWidth/2 stays visually at window.innerWidth/2 regardless
  // of scale (substitute worldX = anchorWorldX below and the scale term
  // drops out entirely). At scale = 1 this reduces algebraically to
  // anchorScreenX + (worldX - distance - anchorScreenX) = worldX -
  // distance -- byte-identical to the pre-anchor formula, verified
  // numerically after this function was written.
  //
  // Camera Phase 3A: + viewportPanXRef.current is the only addition. It's a
  // second, purely Camera-owned value (see its declaration in App(), right
  // next to viewportScaleRef) -- a constant horizontal offset, independent
  // of worldX, so it doesn't disturb the screen = trackX + worldX*scale
  // relationship this formula already guarantees (it just shifts trackX).
  // handleZoomStep recomputes it, each time scale changes, to exactly
  // cancel out the shift a center-anchored zoom would otherwise produce at
  // whatever screen position the zoom is anchored on -- viewport center
  // for the buttons, the cursor for wheel/pinch. Navigator's `distance`
  // never appears in that recomputation and is never written here; at
  // panRef = 0 (its default, and its value whenever every zoom so far has
  // been anchored exactly at center) this is a no-op, so scale = 1 and
  // center-anchored zoom stay byte-identical to Phase 1/2.
  const projectWorldToScreenX = (worldX, distance, scale) => {
    const anchorScreenX = window.innerWidth / 2;
    const anchorWorldX = distance + anchorScreenX;
    return anchorScreenX + (worldX - anchorWorldX) * scale + viewportPanXRef.current;
  };

  // Deliberately NOT a projectWorldToScreenY. There is still no vertical
  // world coordinate to project -- Navigator owns no vertical distance,
  // no item's vertical placement is ever individually computed in JS (each
  // item's `top` is static world-space CSS, carried along by this
  // element's own single transform), and this function still takes no
  // worldY parameter, because nothing about an individual item's vertical
  // position varies.
  //
  // Vertical framing is intentionally NOT cursor-anchored. The archive is
  // horizontally navigable but has no vertical world to navigate -- its
  // vertical position is a fixed composition centered on the OpeningViewport,
  // not a place the cursor can be "over." This is the sole vertical term:
  // pure opening-anchored scale compensation, anchored on openingHeight/2 --
  // the viewing-window opening's OWN center, supplied by Application Layout
  // -- not window.innerHeight/2 and not any interaction-time cursor position.
  // This element's local coordinate space starts at the opening's own
  // top-left (Archive no longer bakes any page-relative offset into tile
  // positions), so the anchor has to be expressed in that same
  // opening-relative space. Application Layout positions the opening itself
  // on the page separately, via untransformed layout, so this function never
  // needs to know where on the page that is. Because there is no cursor or
  // pan term here, the composition returns to exactly this same vertical
  // position at every scale, on every zoom in/out cycle, with no possibility
  // of drift.
  const getVerticalScaleCompensation = (scale) => {
    return (openingHeight / 2) * (1 - scale);
  };

  const applyTransform = (distance) => {
    const scale = viewportScaleRef.current;
    setTrackX(projectWorldToScreenX(0, distance, scale));
    setTrackY(getVerticalScaleCompensation(scale));
    setTrackScaleX(scale);
    setTrackScaleY(scale);
  };

  const primeEntranceState = (galleryItems) => {
    galleryItems.forEach((item) => {
      const wrapper = wrapperById.get(item.id);
      if (!wrapper) return;
      if (animatedImages.has(item.id)) return;

      gsap.set(wrapper, {
        opacity: 0.18,
        y: 12,
        scale: 0.96,
        filter: "blur(8px) saturate(0.72) brightness(0.94)",
      });
      wrapper.dataset.initialReveal = wrapper.dataset.initialReveal || "true";
      wrapper.dataset.smoothX = "0";
      wrapper.dataset.smoothY = "12";
      wrapper.dataset.smoothScale = "0.96";
    });
  };

  const updateEntranceAnimations = (galleryItems) => {
    galleryItems.forEach((item) => {
      const wrapper = wrapperById.get(item.id);
      if (!wrapper) return;

      const layoutLeft = Number.parseFloat(item.layout.left);
      const layoutWidth = Number.parseFloat(item.layout.width);
      const screenLeft = projectWorldToScreenX(
        layoutLeft,
        movement.distance,
        viewportScaleRef.current,
      );
      const screenRight = screenLeft + layoutWidth;
      const isVisible = screenRight > 0 && screenLeft < window.innerWidth;
      const isNearViewport =
        screenRight > -preEntryDistance &&
        screenLeft < window.innerWidth + preEntryDistance;
      const isAwayFromViewport =
        screenRight < -preEntryDistance ||
        screenLeft > window.innerWidth + preEntryDistance;
      const wrapperCenter = screenLeft + layoutWidth / 2;
      const viewportCenter = window.innerWidth / 2;
      const centerAmount =
        1 -
        clamp(Math.abs(wrapperCenter - viewportCenter) / viewportCenter, 0, 1);
      const centerScale = 1 - centerAmount * 0.05;
      const relationshipProgress = item.layout.relationshipMotion
        ? Number(wrapper.dataset.relationshipProgress || 0)
        : 0;
      const relationshipTarget =
        item.layout.relationshipMotion && movement.direction >= 0 ? 1 : 0;
      const nextRelationshipProgress =
        relationshipProgress +
        (relationshipTarget - relationshipProgress) * 0.08;
      const relationshipX =
        (item.layout.relationshipMotion?.targetX || 0) *
        nextRelationshipProgress;
      const relationshipY =
        (item.layout.relationshipMotion?.targetY || 0) *
        nextRelationshipProgress;

      if (item.layout.relationshipMotion) {
        wrapper.dataset.relationshipProgress = String(
          nextRelationshipProgress,
        );
      }

      if (isNearViewport && !animatedImages.has(item.id)) {
        animatedImages.add(item.id);

        const initialStagger =
          wrapper.dataset.initialReveal === "true" && isVisible
            ? clamp(screenLeft / window.innerWidth, 0, 1) * 0.42
            : 0;

        gsap.fromTo(
          wrapper,
          {
            opacity: 0.18,
            y: 12,
            scale: 0.96,
            filter: "blur(8px) saturate(0.72) brightness(0.94)",
          },
          {
            opacity: item.opacity,
            y: 0,
            scale: 1,
            filter: "blur(0px) saturate(1) brightness(1)",
            duration: item.motion.duration,
            delay: initialStagger + item.motion.delay,
            ease: "power3.out",
            onComplete: () => {
              wrapper.dataset.initialReveal = "false";
              wrapper.dataset.hasEntered = "true";
              wrapper.dataset.smoothX = "0";
              wrapper.dataset.smoothY = "0";
              wrapper.dataset.smoothScale = "1";
            },
            overwrite: "auto",
          },
        );
      }

      if (
        isVisible &&
        animatedImages.has(item.id) &&
        wrapper.dataset.hasEntered === "true"
      ) {
        const targetX = relationshipX;
        const targetY = relationshipY;
        const targetScale = centerScale;
        const smoothX = Number(wrapper.dataset.smoothX || 0);
        const smoothY = Number(wrapper.dataset.smoothY || 0);
        const smoothScale = Number(wrapper.dataset.smoothScale || 1);
        const nextX = smoothX + (targetX - smoothX) * 0.14;
        const nextY = smoothY + (targetY - smoothY) * 0.14;
        const nextScale =
          smoothScale + (targetScale - smoothScale) * 0.14;

        wrapper.dataset.smoothX = String(nextX);
        wrapper.dataset.smoothY = String(nextY);
        wrapper.dataset.smoothScale = String(nextScale);

        gsap.set(wrapper, {
          opacity: item.opacity,
          x: nextX,
          y: nextY,
          scale: nextScale,
          zIndex:
            nextRelationshipProgress > 0.02
              ? item.layout.relationshipMotion?.zIndex || item.layout.zIndex
              : item.layout.zIndex,
        });
      }

      if (isAwayFromViewport && animatedImages.has(item.id)) {
        animatedImages.delete(item.id);
        gsap.set(wrapper, {
          opacity: 0.18,
          x: 0,
          y: 12,
          scale: 0.96,
          zIndex: item.layout.zIndex,
          filter: "blur(8px) saturate(0.72) brightness(0.94)",
        });
        wrapper.dataset.relationshipProgress = "0";
        wrapper.dataset.hasEntered = "false";
        wrapper.dataset.smoothX = "0";
        wrapper.dataset.smoothY = "12";
        wrapper.dataset.smoothScale = "0.96";
      }
    });
  };

  const updateRenderWindow = () => {
    if (focusedIdRef.current !== null) return;

    const nextRenderWindow = getGalleryRenderWindow(movement.distance);
    const currentRenderWindow = renderWindowRef.current;

    if (
      Math.abs(nextRenderWindow.left - currentRenderWindow.left) <
        renderWindowUpdateThreshold &&
      Math.abs(nextRenderWindow.right - currentRenderWindow.right) <
        renderWindowUpdateThreshold
    ) {
      return;
    }

    renderWindowRef.current = nextRenderWindow;
    setRenderWindowState(nextRenderWindow);
  };

  return {
    applyTransform,
    primeEntranceState,
    updateEntranceAnimations,
    updateRenderWindow,
  };
}

function App() {
  const scrollContainerRef = useRef(null);
  const trackRef = useRef(null);
  const overlayRef = useRef(null);
  const focusedCloneRef = useRef(null);
  const galleryMovementRef = useRef({
    direction: 1,
    distance: 0,
    enabled: true,
    velocity: 0,
    hasBrowsed: false,
  });
  const isExtendingGalleryRef = useRef(false);
  const animatedImagesRef = useRef(new Set());
  // Registry ownership fix: a single persistent Map(item id -> wrapper DOM
  // node), maintained entirely by each wrapper's own callback ref (see the
  // ref prop on .gallery-image-wrapper below) -- set on mount, deleted on
  // unmount. Replaces the old wrapperById, which was a Map built once via
  // querySelectorAll per run of the big navigation effect (i.e. only when
  // `galleryItems` changed). That snapshot went stale the moment a wrapper
  // was mounted or unmounted for any OTHER reason -- a renderWindow update
  // or a focusedId toggle, both of which run on their own schedule,
  // independent of `galleryItems` -- leaving Gallery Renderer's entrance
  // animations pointed at a detached node (or no node) while React had
  // already mounted a different, untouched one for the same id. This Map
  // is the same object for the lifetime of the component (never
  // reassigned, only mutated by the ref callbacks), so it can never go
  // stale relative to the DOM: registration and deregistration are React
  // mount/unmount events, not a periodic snapshot.
  const wrapperRegistryRef = useRef(new Map());
  // Camera owns this and this alone: the current zoom scale. No vertical
  // state, no interaction logic. Default is 1 -- the untouched, pre-camera
  // baseline. A ref, not state, since it's read every animation frame by
  // Gallery Renderer (galleryMovementRef's own reasoning applies here too:
  // no React re-render is needed just because a frame ticked or a zoom
  // button was clicked -- the next requestAnimationFrame tick picks up the
  // new value on its own). Archive and Navigator still never read this.
  // Set directly by handleZoomStep below, with a plain, un-eased
  // assignment; no smoothing or inertia.
  const viewportScaleRef = useRef(1);
  // Camera owns two things total: scale, and one pan correction, on the X
  // axis only. viewportPanXRef is a constant screen-px offset that makes
  // horizontal zoom anchor on the cursor (or, for the buttons, viewport
  // center) instead of always the center. Purely Camera's own correction
  // term: it neither reads nor writes Navigator's `distance`, Archive never
  // sees it, and it only ever changes inside handleZoomStep, in the same
  // plain/un-eased way viewportScaleRef does. Defaults to 0, which is a
  // total no-op in projectWorldToScreenX -- so scale = 1 and any zoom
  // sequence anchored exactly at center are unaffected, byte-identical to
  // Phase 1/2. There is deliberately no vertical counterpart: the archive
  // has no vertical world to navigate, so Y has no cursor-derived pan term
  // at all -- see getVerticalScaleCompensation's own comment.
  const viewportPanXRef = useRef(0);
  const focusTimelineRef = useRef(null);
  const focusedIdRef = useRef(null);
  const renderWindowRef = useRef(getGalleryRenderWindow());
  // Application Layout's own state -- the viewing-window opening's
  // position (top/bottom) and size (height) on the page. Read imperatively
  // here (by extendGalleryIfNeeded and by the Gallery Renderer, both inside
  // the per-frame effect) exactly the way renderWindowRef already is;
  // mirrored into React state below purely so the JSX can apply top/height
  // as real, untransformed marginTop/height on .opening-viewport -- the
  // one element that owns the clip boundary (see OpeningViewport's own
  // comment in the JSX and in styles.css).
  const openingGeometryRef = useRef(getViewportOpeningGeometry());
  const columnStateRef = useRef(null);
  // Hover Overlay metadata feature: a plain counter, bumped once per
  // regenerateGallery call below, and nowhere else. Not Archive generation
  // itself (buildGalleryItems/createGalleryBatch/createColumnState are
  // untouched) -- this is the same kind of cross-cutting, non-Archive-owned
  // App-level bookkeeping regenerateGallery already does for
  // movement.distance and animatedImagesRef. HoverOverlay uses it (passed
  // down as `generation`) purely as an input to a deterministic per-item
  // shuffle seed, so each item's randomized theme/tag order stays stable
  // across re-renders, scrolling, and virtualization remounts, and only
  // changes when this counter changes -- i.e. only on a real regeneration.
  const galleryGenerationRef = useRef(0);
  // Guards against a burst of logo clicks queueing up multiple
  // regenerations -- set true as soon as a logo-triggered regeneration
  // begins (see handleLogoClick), cleared after the freshly regenerated
  // gallery has settled (GALLERY_REGENERATION_SETTLE_MS).
  const isRegeneratingFromLogoRef = useRef(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [renderWindow, setRenderWindow] = useState(() =>
    getGalleryRenderWindow(),
  );
  const [openingGeometry, setOpeningGeometry] = useState(() =>
    getViewportOpeningGeometry(),
  );
  const [focusedId, setFocusedId] = useState(null);
  const [focusedImage, setFocusedImage] = useState(null);
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);
  // Drives a brief opacity dip on the gallery track during a logo-triggered
  // regeneration (see handleLogoClick below and the matching .is-regenerating
  // rule in styles.css) -- mount and resize are untouched and stay instant.
  const [isGalleryTransitioning, setIsGalleryTransitioning] = useState(false);
  // Relationship Highlight Pipeline (Commit 3): Gallery (this component) is
  // the single owner of relatedArchiveNumbers, the shared state later
  // commits will read to drive highlighting -- nothing renders from it yet.
  // hoveredGalleryItemId just tracks which .gallery-image-wrapper is
  // currently under the pointer, set by plain onMouseEnter/onMouseLeave
  // below; relatedArchiveNumbers is populated by HoverOverlay's own
  // onRelatedArchiveNumbersChange callback (see the call site below) and
  // resets to [] the moment hover ends. Neither the Relationship Engine nor
  // HoverOverlay hold this state -- this is purely where it's lifted to.
  const [hoveredGalleryItemId, setHoveredGalleryItemId] = useState(null);
  const [relatedArchiveNumbers, setRelatedArchiveNumbers] = useState([]);

  // Relationship Highlight Pipeline (Commit 3): the only two handlers this
  // pipeline needs. They just record which item is hovered -- no matching,
  // no rendering decisions, no CSS. setRelatedArchiveNumbers itself is
  // passed straight through to HoverOverlay as onRelatedArchiveNumbersChange
  // below; it's already a stable setState function, so no extra useCallback
  // wrapper is needed for it.
  const handleGalleryImageHoverStart = useCallback((itemId) => {
    setHoveredGalleryItemId(itemId);
  }, []);
  const handleGalleryImageHoverEnd = useCallback(() => {
    setHoveredGalleryItemId(null);
  }, []);

  // Shared regeneration sequence -- used on mount, on window resize, and
  // (see handleLogoClick below) when the logo is clicked on the homepage.
  // REFACTORED (extension-pipeline fix): buildGalleryItems no longer
  // mutates a columnState object in place -- it returns the final one
  // alongside the items, and that's what columnStateRef gets set to. This
  // call site is outside any React updater (setGalleryItems is passed a
  // plain value here, not a function), so it was never part of the bug --
  // this is purely the pure-function-based rebuild the pipeline was
  // refactored to support.
  const regenerateGallery = useCallback(() => {
    galleryMovementRef.current.distance = 0;
    resetCameraToNeutral();
    galleryGenerationRef.current += 1;
    const nextOpeningGeometry = getViewportOpeningGeometry();
    openingGeometryRef.current = nextOpeningGeometry;
    setOpeningGeometry(nextOpeningGeometry);
    renderWindowRef.current = getGalleryRenderWindow(0);
    setRenderWindow(renderWindowRef.current);
    animatedImagesRef.current.clear();
    const { items, nextColumnState } = buildGalleryItems(
      createColumnState(),
      initialGalleryBatches,
      nextOpeningGeometry.height,
    );
    columnStateRef.current = nextColumnState;
    setGalleryItems(items);
  }, []);

  useEffect(() => {
    regenerateGallery();
    window.addEventListener("resize", regenerateGallery);

    return () => {
      window.removeEventListener("resize", regenerateGallery);
    };
  }, [regenerateGallery]);

  const getImageWrapper = useCallback((imageId) => {
    return trackRef.current?.querySelector(`[data-image-id="${imageId}"]`);
  }, []);

  // Camera Phase 1/3A: the zoom controls' (and now wheel/pinch's) only job
  // is to move Camera's state by a step, clamped to a fixed range -- a
  // plain synchronous assignment to the refs Gallery Renderer already
  // reads every frame. No easing, no inertia, no animation; the very next
  // requestAnimationFrame tick (already running continuously) picks up the
  // new values on its own, exactly the same way it already picks up
  // movement.distance changes.
  //
  // anchorClientX is the screen position this particular zoom should hold
  // fixed horizontally -- event.clientX for wheel/pinch, or omitted for the
  // buttons, which default to viewport center (no new state invented just
  // for them, per Phase 3A's own constraint). This is the X axis's own pan
  // update, the closed-form solution of "whatever world point currently
  // projects to this anchor must still project to it after scale changes":
  // with k = anchor-offset-from-viewport-center and r = newScale / oldScale,
  // the only value of the pan ref that keeps that invariant is
  // k*(1 - r) + oldPan*r -- derived directly from projectWorldToScreenX,
  // solved for the new pan term with distance held fixed (Navigator is
  // never read or written here). At k = 0 (buttons, or a wheel/pinch
  // dead-center) this reduces to oldPan*r -- 0 stays 0, matching the old
  // center-anchored behavior exactly. Because this is an exact algebraic
  // solve rather than an iterative approximation, zooming in and back out
  // over the same anchor returns the pan ref to its exact prior value -- no
  // accumulated drift over repeated zoom cycles.
  //
  // There is deliberately no vertical counterpart. The vertical axis has no
  // navigable world for a cursor position to be "over," so Y is never
  // touched here at all -- it comes entirely from getVerticalScaleCompensation
  // (opening-anchored scale compensation only), called directly by
  // applyTransform. A second parameter for anchorClientY was deliberately
  // not added; passing a Y coordinate into this function would invite exactly
  // the cursor-derived vertical drift this architecture avoids.
  const handleZoomStep = useCallback((delta, anchorClientX) => {
    const oldScale = viewportScaleRef.current;
    const newScale = clamp(oldScale + delta, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);
    const scaleRatio = newScale / oldScale;

    const viewportCenterX = window.innerWidth / 2;
    const kX = (anchorClientX ?? viewportCenterX) - viewportCenterX;
    viewportPanXRef.current =
      kX * (1 - scaleRatio) + viewportPanXRef.current * scaleRatio;

    viewportScaleRef.current = newScale;
  }, []);

  // Camera state/control split: this is a pure mechanism, not a policy.
  // It synchronously restores scale and the (X-only) pan ref to their
  // defaults -- nothing more. It does not watch scale, does not run on an
  // effect, does not get invoked automatically at zoom limits, and does not
  // infer intent from camera values. Camera exposes it; callers (e.g.
  // regenerateGallery) decide when a reset is warranted.
  const resetCameraToNeutral = useCallback(() => {
    viewportScaleRef.current = CAMERA_NEUTRAL_SCALE;
    viewportPanXRef.current = CAMERA_NEUTRAL_PAN;
  }, []);

  const handleExitFocus = useCallback(() => {
    const activeId = focusedIdRef.current;
    if (activeId === null) return;

    const track = trackRef.current;
    const overlay = overlayRef.current;
    if (!track || !overlay) return;

    focusTimelineRef.current?.kill();
    focusedIdRef.current = null;
    setFocusedId(null);

    const clone = focusedCloneRef.current;
    const relatedClones = gsap.utils.toArray(".related-image-frame");
    const activeWrapper = getImageWrapper(activeId);
    const activeRect = activeWrapper?.getBoundingClientRect();

    const tl = gsap.timeline({
      defaults: { duration: 0.45, ease: "power3.out" },
      onComplete: () => {
        setFocusedImage(null);
        galleryMovementRef.current.enabled = true;
      },
    });

    tl.to(
      overlay,
      {
        opacity: 0,
        duration: 0.3,
        pointerEvents: "none",
      },
      0,
    );

    tl.to(
      ".theme-connectors, .focus-theme-title",
      {
        opacity: 0,
        duration: 0.2,
      },
      0,
    );

    if (clone && activeRect) {
      tl.to(
        clone,
        {
          left: activeRect.left,
          top: activeRect.top,
          width: activeRect.width,
          height: activeRect.height,
          scale: 1,
          duration: 0.45,
        },
        0,
      );
    }

    relatedClones.forEach((relatedClone) => {
      const { left, top, width, height } = relatedClone.dataset;

      tl.to(
        relatedClone,
        {
          left: Number(left),
          top: Number(top),
          width: Number(width),
          height: Number(height),
          scale: 1,
          opacity: 0,
          duration: 0.4,
        },
        0,
      );
    });

    galleryItems.forEach((item) => {
      const wrapper = getImageWrapper(item.id);
      if (!wrapper) return;

      tl.to(
        wrapper,
        {
          x: 0,
          y: 0,
          scale: 1,
          opacity: item.opacity,
          filter: "none",
          pointerEvents: "auto",
          zIndex: 1,
        },
        item.id === activeId ? 0.18 : 0,
      );
    });

    focusTimelineRef.current = tl;
  }, [galleryItems, getImageWrapper]);

  // Homepage-only logo behavior: regenerate the gallery via the same pure
  // pipeline used on mount and resize, rather than navigating anywhere.
  // Child pages don't use this at all -- Header keeps their logo on its
  // existing navigate("/") behavior. Deliberately does not touch
  // handleExitFocus's own signature (it's also wired directly as
  // onClick={handleExitFocus} elsewhere, so adding a parameter there would
  // wire the raw click event in as if it were a callback).
  const handleLogoClick = useCallback(() => {
    if (isRegeneratingFromLogoRef.current) return;
    isRegeneratingFromLogoRef.current = true;

    const beginRegeneration = () => {
      // Fade the track out first, swap the composition once it's no
      // longer visible, then let the .is-regenerating class removal fade
      // it back in -- same dip-and-return motion as the veil, just scoped
      // to the track instead of the whole viewport.
      setIsGalleryTransitioning(true);
      window.setTimeout(() => {
        regenerateGallery();
        setIsGalleryTransitioning(false);
        window.setTimeout(() => {
          isRegeneratingFromLogoRef.current = false;
        }, GALLERY_REGENERATION_SETTLE_MS);
      }, GALLERY_FADE_MS);
    };

    if (focusedIdRef.current !== null) {
      handleExitFocus();
      window.setTimeout(beginRegeneration, EXIT_FOCUS_DURATION_MS);
    } else {
      beginRegeneration();
    }
  }, [handleExitFocus, regenerateGallery]);

  const handleImageClick = useCallback(
    (imageId) => {
      if (focusedIdRef.current !== null) return;

      const wrapper = getImageWrapper(imageId);
      const overlay = overlayRef.current;
      if (!wrapper || !overlay) return;

      focusTimelineRef.current?.kill();
      focusedIdRef.current = imageId;
      setFocusedId(imageId);

      galleryMovementRef.current.enabled = false;
      galleryMovementRef.current.velocity = 0;

      const rect = wrapper.getBoundingClientRect();
      const focusedItem = galleryItems.find((item) => item.id === imageId);
      const relatedImages = focusedItem.tag
        ? galleryItems
            .filter((item) => item.id !== imageId && item.tag === focusedItem.tag)
            .map((item) => {
              const relatedWrapper = getImageWrapper(item.id);
              const relatedRect = relatedWrapper?.getBoundingClientRect();

              return {
                id: item.id,
                src: item.src,
                alt: item.alt,
                tag: item.tag,
                rect: relatedRect
                  ? {
                      left: relatedRect.left,
                      top: relatedRect.top,
                      width: relatedRect.width,
                      height: relatedRect.height,
                    }
                  : null,
              };
            })
            .filter((item) => item.rect)
            .slice(0, 6)
        : [];

      setFocusedImage({
        id: imageId,
        src: focusedItem.src,
        alt: focusedItem.alt,
        tag: focusedItem.tag,
        relatedImages,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      });

      const tl = gsap.timeline({
        defaults: { duration: 0.55, ease: "power3.out" },
      });

      tl.to(
        overlay,
        {
          opacity: 0.36,
          duration: 0.35,
          pointerEvents: "auto",
        },
        0,
      );

      galleryItems.forEach((item) => {
        const imageWrapper = getImageWrapper(item.id);
        if (!imageWrapper) return;

        tl.to(
          imageWrapper,
          {
            x: 0,
            y: 0,
            scale: 0.94,
            opacity: 0,
            filter: "brightness(0.62) saturate(0.82)",
            pointerEvents: "none",
            zIndex: 1,
          },
          0,
        );
      });

      focusTimelineRef.current = tl;
    },
    [galleryItems, getImageWrapper],
  );

  const handleRelatedImageEnter = useCallback((event) => {
    const hovered = event.currentTarget;
    const hoveredScale = Number(hovered.dataset.clusterScale || 1);

    gsap.to(hovered, {
      scale: hoveredScale * 1.14,
      opacity: 1,
      zIndex: 1090,
      duration: 0.22,
      ease: "power2.out",
    });

    gsap.to(".related-image-frame", {
      opacity: (index, target) => (target === hovered ? 1 : 0.46),
      scale: (index, target) =>
        target === hovered
          ? hoveredScale * 1.14
          : Number(target.dataset.clusterScale || 1),
      zIndex: (index, target) => (target === hovered ? 1090 : 1050),
      duration: 0.22,
      ease: "power2.out",
    });
  }, []);

  const handleRelatedImageLeave = useCallback(() => {
    gsap.to(".related-image-frame", {
      opacity: 1,
      scale: (index, target) => Number(target.dataset.clusterScale || 1),
      zIndex: 1050,
      duration: 0.24,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    if (!focusedImage) return;

    const clone = focusedCloneRef.current;
    if (!clone) return;

    const { left, top, width, height } = focusedImage.rect;

    gsap.set(clone, {
      left,
      top,
      width,
      height,
      scale: 1,
      opacity: 1,
      filter: "none",
      transformOrigin: "center center",
    });

    gsap.to(clone, {
      left: window.innerWidth / 2 - width / 2,
      top: window.innerHeight / 2 - height / 2,
      scale: 1.08,
      duration: 0.55,
      ease: "power3.out",
    });

    gsap.fromTo(
      ".focus-theme-title",
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
    );

    gsap.utils.toArray(".related-image-frame").forEach((relatedClone, index) => {
      const placement = clusterPlacements[index % clusterPlacements.length];
      const relatedWidth = Number(relatedClone.dataset.width);
      const relatedHeight = Number(relatedClone.dataset.height);
      const clusterScale = placement.scale;
      const clusterCenter = getClusterCenter(placement, focusedImage.rect, {
        width: relatedWidth,
        height: relatedHeight,
      });

      gsap.set(relatedClone, {
        left: Number(relatedClone.dataset.left),
        top: Number(relatedClone.dataset.top),
        width: relatedWidth,
        height: relatedHeight,
        scale: 1,
        opacity: 0,
        transformOrigin: "center center",
      });

      gsap.to(relatedClone, {
        left: clusterCenter.x - relatedWidth / 2,
        top: clusterCenter.y - relatedHeight / 2,
        scale: clusterScale,
        opacity: 1,
        duration: 0.55,
        delay: 0.04 * index,
        ease: "power3.out",
      });
    });

    gsap.utils.toArray(".theme-connector-line").forEach((line, index) => {
      const length = line.getTotalLength();
      const timing = connectorTimings[index % connectorTimings.length];

      gsap.set(line, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      gsap.to(line, {
        strokeDashoffset: 0,
        duration: timing.duration,
        delay: timing.delay,
        ease: "power2.out",
      });
    });
  }, [focusedImage]);

  useEffect(() => {
    const scrollKeys = new Set([
      " ",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ]);

    const preventFocusScroll = (event) => {
      if (focusedIdRef.current !== null) {
        event.preventDefault();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleExitFocus();
        return;
      }

      if (focusedIdRef.current !== null && scrollKeys.has(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventFocusScroll, { passive: false });
    window.addEventListener("touchmove", preventFocusScroll, { passive: false });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", preventFocusScroll);
      window.removeEventListener("touchmove", preventFocusScroll);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleExitFocus]);

  useEffect(() => {
    if (galleryItems.length === 0) return;

    const scrollContainer = scrollContainerRef.current;
    const track = trackRef.current;

    if (!scrollContainer || !track) return;

    const movement = galleryMovementRef.current;
    const animatedImages = animatedImagesRef.current;
    const preEntryDistance = 360;
    const friction = 0.92;
    const browsingThreshold = 48;
    const renderWindowUpdateThreshold = Math.max(window.innerWidth * 0.35, 240);
    let animationFrame = null;
    let touchPoint = null;

    scrollContainer.style.height = "100vh";

    // wrapperRegistryRef.current is the same persistent Map for the whole
    // component lifetime, kept correct by each wrapper's own callback ref
    // (mount/unmount), not rebuilt here -- see wrapperRegistryRef's own
    // comment. Passing the Map itself (not a snapshot copy) means every
    // registration/deregistration that happens after this effect starts is
    // still visible through this same reference, exactly like
    // viewportScaleRef or renderWindowRef already are for their own state.
    const galleryRenderer = createGalleryRenderer({
      track,
      wrapperById: wrapperRegistryRef.current,
      animatedImages,
      movement,
      viewportScaleRef,
      viewportPanXRef,
      renderWindowRef,
      setRenderWindowState: setRenderWindow,
      focusedIdRef,
      preEntryDistance,
      renderWindowUpdateThreshold,
      openingHeight: openingGeometryRef.current.height,
    });

    galleryRenderer.primeEntranceState(galleryItems);

    const extendGalleryIfNeeded = () => {
      const remainingTrack = track.scrollWidth - movement.distance;
      const extensionThreshold = window.innerWidth * 3;

      if (
        remainingTrack > extensionThreshold ||
        isExtendingGalleryRef.current
      ) {
        return;
      }

      isExtendingGalleryRef.current = true;

      // *** THE FIX (extension-pipeline refactor) ***
      //
      // Everything from here down to the setGalleryItems call used to
      // happen INSIDE the functional updater passed to setGalleryItems --
      // including the createGalleryBatch call that mutated
      // columnStateRef.current in place. That made the mutation itself
      // subject to however many times React chose to invoke that updater,
      // which the tracing this session confirmed was happening well beyond
      // the immediate double-check.
      //
      // Now: nextBatchIndex, the batch itself, and the next columnState are
      // all computed and applied HERE -- synchronously, in the body of
      // extendGalleryIfNeeded, which can only reach this point once per
      // real (non-reentrant) invocation, guaranteed by the
      // isExtendingGalleryRef guard above. `galleryItems` is the current
      // render's own state value (this whole effect re-runs and recreates
      // this closure on every galleryItems commit, so it's always the
      // latest committed value by the time a genuinely new invocation gets
      // this far -- the guard's own reset is deferred to the NEXT
      // animation frame specifically so the current commit has already
      // landed and this closure has already been refreshed before that
      // happens). columnStateRef.current is mutated exactly once, right
      // here, as a single plain assignment -- not from inside anything
      // React could re-invoke.
      //
      // The updater actually passed to setGalleryItems below is now just
      // `(currentItems) => [...currentItems, ...newBatch]` -- newBatch is a
      // fixed, already-computed array closed over from here, and the
      // updater touches nothing else. However many times React invokes
      // that updater, it produces the identical result every time and
      // mutates nothing, so replay is harmless by construction.
      const nextBatchIndex = getNextGalleryBatchIndex(galleryItems);

      const { items: newBatch, nextColumnState } = createGalleryBatch(
        nextBatchIndex,
        columnStateRef.current,
        openingGeometryRef.current.height,
      );

      columnStateRef.current = nextColumnState;

      setGalleryItems((currentItems) => [...currentItems, ...newBatch]);

      requestAnimationFrame(() => {
        isExtendingGalleryRef.current = false;
      });
    };

    const updateGalleryMotion = () => {
      galleryRenderer.applyTransform(movement.distance);
      extendGalleryIfNeeded();
      galleryRenderer.updateRenderWindow();
      galleryRenderer.updateEntranceAnimations(galleryItems);
      if (movement.distance > browsingThreshold) {
        movement.hasBrowsed = true;
      }
      document.documentElement.classList.toggle(
        "is-browsing",
        movement.hasBrowsed,
      );
    };

    const animateGallery = () => {
      const canMove = movement.enabled && focusedIdRef.current === null;
      const currentVelocity = canMove ? movement.velocity : 0;

      if (currentVelocity !== 0) {
        movement.direction = currentVelocity > 0 ? 1 : -1;
      }

      movement.distance = Math.max(0, movement.distance + currentVelocity);

      if (movement.distance === 0 && movement.velocity < 0) {
        movement.velocity = 0;
      } else {
        movement.velocity *= friction;
      }

      updateGalleryMotion();
      animationFrame = requestAnimationFrame(animateGallery);
    };

    const addGalleryVelocity = (delta) => {
      if (!movement.enabled || focusedIdRef.current !== null) return;

      if (delta !== 0) {
        movement.direction = delta > 0 ? 1 : -1;
      }

      movement.velocity = clamp(movement.velocity + delta * 0.16, -42, 42);
    };

    const handleWheel = (event) => {
      // preventDefault unconditionally, before branching -- this is what
      // stops the browser's own native page-zoom, which Chrome/Firefox/
      // Safari all trigger from a ctrlKey wheel event (see below) exactly
      // as they would from an actual Ctrl+scroll.
      event.preventDefault();

      // Browsers report a trackpad pinch gesture as a wheel event with
      // ctrlKey set to true (a deliberate synthesized signal, the same one
      // browsers use internally to distinguish "the user is pinch-zooming"
      // from "the user is two-finger-scrolling") -- so this one check
      // covers both real Ctrl+wheel and a natural trackpad pinch, with no
      // separate gesture-detection logic of its own. handleZoomStep is
      // reused as-is: same clamp, same range, no new mutation path for
      // viewportScaleRef. event.clientX (Phase 3A) is the cursor's actual
      // screen position at the moment of this gesture -- the point
      // handleZoomStep will keep visually anchored, horizontally only; the
      // vertical composition stays fixed to the OpeningViewport regardless
      // of where this gesture occurred.
      if (event.ctrlKey) {
        handleZoomStep(
          -event.deltaY * CAMERA_ZOOM_WHEEL_SENSITIVITY,
          event.clientX,
        );
        return;
      }

      addGalleryVelocity(event.deltaY + event.deltaX);
    };

    const handleTouchStart = (event) => {
      const touch = event.touches[0];
      touchPoint = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch || !touchPoint) return;

      event.preventDefault();

      const deltaX = touchPoint.x - touch.clientX;
      const deltaY = touchPoint.y - touch.clientY;
      touchPoint = { x: touch.clientX, y: touch.clientY };
      addGalleryVelocity(deltaX + deltaY);
    };

    updateGalleryMotion();
    animationFrame = requestAnimationFrame(animateGallery);

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      focusTimelineRef.current?.kill();
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [galleryItems]);

  if (galleryItems.length === 0) {
    return <div className="app-shell" />;
  }

  const renderedGalleryItems =
    focusedId === null
      ? galleryItems.filter((item) => isItemInRenderWindow(item, renderWindow))
      : galleryItems;

  return (
    <div className="app-shell">
      <Header
        onFilterOpenChange={setIsIndexDrawerOpen}
        onDrawerHeightChange={setIndexDrawerHeight}
        onLogoClick={handleLogoClick}
      />

      <div
        className={`scroll-container${
          isIndexDrawerOpen ? " scroll-container--drawer-open" : ""
        }`}
        ref={scrollContainerRef}
        style={{
          // The extra few px beyond the drawer's own measured height keeps
          // a sliver of breathing room between the header's shadow and the
          // archive, rather than the archive butting directly against it.
          transform: indexDrawerHeight
            ? `translateY(${Math.round(indexDrawerHeight) + 8}px)`
            : undefined,
        }}
      >
        <div className="sticky-wrapper">
          {/* OpeningViewport: the only element that owns the visible
              opening. It receives Application Layout's opening geometry
              directly -- marginTop positions it, height sizes it -- and its
              own overflow:hidden is the true clip boundary. It is never a
              transform target: Gallery Renderer continues writing only to
              .gallery-track below. */}
          <div
            className="opening-viewport"
            style={{
              marginTop: `${openingGeometry.top}px`,
              height: `${openingGeometry.height}px`,
            }}
          >
            <div
              className={`gallery-track${
                isGalleryTransitioning ? " is-regenerating" : ""
              }`}
              ref={trackRef}
              style={{ width: `${getGalleryTrackWidth(galleryItems)}px` }}
            >
              {renderedGalleryItems.map((item) => {
              const dimensions = getImageDimensions(item.src);
              // Click is navigation, per the approved Project Template
              // architecture: an image that belongs to a Project always
              // routes to it, regardless of imageFocusEnabled. The
              // existing focus-overlay path below is left exactly as it
              // was -- not removed, not built around -- for images that
              // aren't part of a Project yet, until hover/click are
              // properly separated as their own later task.
              const isProjectLinked = Boolean(item.project);
              const isInteractive = isProjectLinked || imageFocusEnabled;

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    // Registry ownership fix: register/deregister with the
                    // persistent wrapperRegistryRef Map directly on
                    // mount/unmount -- see that ref's own comment. This is
                    // the only place anything writes to that Map.
                    if (node) {
                      wrapperRegistryRef.current.set(item.id, node);
                    } else {
                      wrapperRegistryRef.current.delete(item.id);
                    }
                  }}
                  type="button"
                  data-image-id={item.id}
                  data-batch-index={item.batchIndex}
                  data-module-index={item.moduleIndex}
                  data-pattern-index={item.patternIndex}
                  className={`gallery-image-wrapper${
                    isInteractive ? "" : " gallery-image-wrapper--disabled"
                  }`}
                  onClick={
                    isProjectLinked
                      ? () =>
                          navigate(
                            `/projects/${item.project}?image=${item.archiveNumber}`,
                          )
                      : imageFocusEnabled
                        ? () => handleImageClick(item.id)
                        : undefined
                  }
                  onMouseEnter={() => handleGalleryImageHoverStart(item.id)}
                  onMouseLeave={handleGalleryImageHoverEnd}
                  aria-label={
                    isProjectLinked
                      ? `View project: ${item.alt}`
                      : imageFocusEnabled
                        ? `Focus ${item.alt}`
                        : item.alt
                  }
                  aria-pressed={
                    !isProjectLinked && imageFocusEnabled
                      ? focusedId === item.id
                      : undefined
                  }
                  tabIndex={isInteractive ? 0 : -1}
                  style={{
                    width: item.layout.width,
                    height: item.layout.height,
                    left: item.layout.left,
                    top: item.layout.top,
                    zIndex: item.layout.zIndex,
                  }}
                >
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={getOptimizedImageSrcSet(item.src, "webp")}
                      sizes={getGalleryImageSizes(item.layout)}
                    />
                    <source
                      type="image/jpeg"
                      srcSet={getOptimizedImageSrcSet(item.src, "jpg")}
                      sizes={getGalleryImageSizes(item.layout)}
                    />
                    <img
                      src={getOptimizedImageSrc(item.src)}
                      alt={item.alt}
                      className="gallery-image"
                      width={dimensions.width}
                      height={dimensions.height}
                      loading={shouldEagerLoadImage(item) ? "eager" : "lazy"}
                      fetchPriority={
                        shouldEagerLoadImage(item) ? "high" : "auto"
                      }
                      decoding="async"
                    />
                  </picture>
                  {/* Hover Overlay -- presentation only. Metadata now comes
                      directly from the Archive Item itself (item.themes /
                      item.theme / item.tags / item.archiveNumber, carried
                      through by createGalleryBatch above from
                      mockArchiveItems.js -- see the Prototype Data Contract
                      comment there); no hardcoded literals remain.
                      HoverOverlay's themes prop wiring fix: prefer the
                      richer plural item.themes (2-3 entries per the
                      Commit 3.5 mock data) whenever it's present and
                      non-empty; only fall back to wrapping the legacy
                      singular item.theme in a one-element array when
                      item.themes is missing/empty. theme itself is
                      untouched and still exists on the Archive Item
                      contract, so this stays backward compatible with any
                      record that only ever sets the singular field.
                      HoverOverlay itself is unchanged -- both paths hand it
                      the same array shape it always accepted. Items with no
                      matching Archive Item simply pass null/[]/[];
                      HoverOverlay's own existing empty-state checks already
                      handle that, same as before. Purely additive: an
                      absolutely-positioned child, so it cannot affect this
                      wrapper's own box, Masonry's
                      layout.width/height/left/top above, or any sibling
                      wrapper. itemId + generation are only a stable seed
                      for HoverOverlay's own per-item theme/tag shuffle --
                      see galleryGenerationRef's comment above.
                      isHovered/onRelatedArchiveNumbersChange (Commit 3):
                      HoverOverlay reports its already-computed related
                      Archive Numbers up to this component's
                      relatedArchiveNumbers state while isHovered is true,
                      and reports [] the instant it goes false -- see the
                      Relationship Highlight Pipeline comment near
                      hoveredGalleryItemId's declaration above. Nothing
                      renders from that state yet. */}
                  <HoverOverlay
                    archiveNumber={item.archiveNumber}
                    themes={
                      item.themes?.length
                        ? item.themes
                        : item.theme
                          ? [item.theme]
                          : []
                    }
                    tags={item.tags ?? []}
                    itemId={item.id}
                    generation={galleryGenerationRef.current}
                    isHovered={hoveredGalleryItemId === item.id}
                    onRelatedArchiveNumbersChange={setRelatedArchiveNumbers}
                  />
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <div className="zoom-controls" aria-label="Zoom controls">
        <button
          type="button"
          className="zoom-control"
          aria-label="Zoom out"
          onClick={() => handleZoomStep(-CAMERA_ZOOM_STEP)}
        >
          -
        </button>
        <button
          type="button"
          className="zoom-control"
          aria-label="Zoom in"
          onClick={() => handleZoomStep(CAMERA_ZOOM_STEP)}
        >
          +
        </button>
      </div>

      <button
        ref={overlayRef}
        type="button"
        className="gallery-overlay"
        onClick={handleExitFocus}
        aria-label="Close focused image"
      />

      {focusedImage?.tag && (
        <div className="focus-theme-title">{focusedImage.tag}</div>
      )}

      {focusedImage?.relatedImages.length > 0 && (
        <svg className="theme-connectors" aria-hidden="true">
          {focusedImage.relatedImages.map((item, index) => {
            const connector = getClusterConnector(item, index, focusedImage.rect);

            return (
              <g key={item.id}>
                <line
                  className="theme-connector-line"
                  x1={connector.x1}
                  y1={connector.y1}
                  x2={connector.x2}
                  y2={connector.y2}
                />
              </g>
            );
          })}
        </svg>
      )}

      {focusedImage && (
        <div ref={focusedCloneRef} className="focused-image-frame">
          {(() => {
            const dimensions = getImageDimensions(focusedImage.src);

            return (
          <picture>
            <source
              type="image/webp"
              srcSet={getOptimizedImageSrcSet(focusedImage.src, "webp")}
              sizes="90vw"
            />
            <source
              type="image/jpeg"
              srcSet={getOptimizedImageSrcSet(focusedImage.src, "jpg")}
              sizes="90vw"
            />
            <img
              src={getOptimizedImageSrc(focusedImage.src, 1200)}
              alt={focusedImage.alt}
              width={dimensions.width}
              height={dimensions.height}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
            );
          })()}
        </div>
      )}

      {focusedImage?.relatedImages.map((item, index) => {
        const dimensions = getImageDimensions(item.src);

        return (
          <div
            key={item.id}
            className="focused-image-frame related-image-frame"
            data-left={item.rect.left}
            data-top={item.rect.top}
            data-width={item.rect.width}
            data-height={item.rect.height}
            data-cluster-scale={
              clusterPlacements[index % clusterPlacements.length].scale
            }
            onMouseEnter={handleRelatedImageEnter}
            onMouseLeave={handleRelatedImageLeave}
          >
            <picture>
              <source
                type="image/webp"
                srcSet={getOptimizedImageSrcSet(item.src, "webp")}
                sizes="30vw"
              />
              <source
                type="image/jpeg"
                srcSet={getOptimizedImageSrcSet(item.src, "jpg")}
                sizes="30vw"
              />
              <img
                src={getOptimizedImageSrc(item.src)}
                alt={item.alt}
                width={dimensions.width}
                height={dimensions.height}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
        );
      })}
    </div>
  );
}

export default App;
