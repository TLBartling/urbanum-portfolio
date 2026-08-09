import { useEffect, useState } from "react";
import Logo from "./Logo";

// Traditional static splash/entry screen (Josh review, Commit 1; refined
// per client note, Commit 1 follow-up and reveal-refinement follow-up):
// the Urbanum logo, static, centered -- nothing about the logo itself
// ever moves, scales, or transforms, while the splash is displayed or
// while it exits. The only motion anywhere in this component is opacity,
// staged in two independent parts (see styles.css's own comment on
// .splash-overlay for the full timing rationale):
//   1. The logo (.splash-logo-wrap) fades out alone, ~200ms.
//   2. The whole curtain (.splash-overlay -- background and the now-
//      invisible logo layer together) fades out afterward, ~400ms, via a
//      CSS transition-delay rather than a second JS timer.
// A single class toggle (.splash-overlay--exiting, applied once here on
// click) drives both CSS stages at once; this component doesn't sequence
// them itself. Splitting the fade this way (instead of one shared
// opacity transition on the whole overlay, the previous implementation)
// is what avoids the logo leaving a faint "ghost imprint" over the
// Archive as it disappears -- the logo is fully gone before the curtain
// starts becoming see-through, rather than both fading at once.
//
// Three states instead of two: idle (fully opaque, waiting for a click),
// exiting (both fades are playing, via .splash-overlay--exiting), and
// gone (unmounted). The exiting -> gone transition is driven by the
// CURTAIN's own onTransitionEnd event specifically (the `event.target
// === event.currentTarget` check below excludes the logo layer's own,
// earlier-firing transitionend, which bubbles up first but targets a
// child element, not .splash-overlay itself) -- so the unmount happens
// exactly when the curtain visually finishes, not when the logo does.
// EXIT_FALLBACK_MS is a safety net only, in case that event never fires
// for some reason -- without it, a missed event would leave the splash
// stuck fully transparent but still mounted, still intercepting clicks.
// Its value must stay comfortably above the curtain's own total elapsed
// time in styles.css (250ms delay + 400ms fade = 650ms); keep the two in
// sync if either changes.
//
// Markup and classes are otherwise unchanged from the previous version
// (.splash-overlay / .splash-overlay__bg / .splash-logo-wrap /
// .splash-logo, see styles.css) so the visual language -- background
// color, logo size, centering -- carries over exactly.
const EXIT_FALLBACK_MS = 730; // curtain's own 650ms (250ms delay + 400ms fade) + a small safety margin

export default function SplashScreen() {
  const [isExiting, setIsExiting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isExiting) return undefined;

    const fallbackId = setTimeout(() => setIsDone(true), EXIT_FALLBACK_MS);
    return () => clearTimeout(fallbackId);
  }, [isExiting]);

  if (isDone) return null;

  const enterArchive = () => setIsExiting(true);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      enterArchive();
    }
  };

  const handleTransitionEnd = (event) => {
    if (event.target === event.currentTarget && event.propertyName === "opacity") {
      setIsDone(true);
    }
  };

  return (
    <div
      className={`splash-overlay${isExiting ? " splash-overlay--exiting" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Enter the archive"
      onClick={enterArchive}
      onKeyDown={handleKeyDown}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="splash-overlay__bg" />
      <div className="splash-logo-wrap">
        <Logo className="splash-logo" />
      </div>
    </div>
  );
}
