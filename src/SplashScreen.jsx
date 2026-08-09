import { useEffect, useState } from "react";
import Logo from "./Logo";

// Traditional static splash/entry screen (Josh review, Commit 1; refined
// per client note, Commit 1 follow-up): the Urbanum logo, static,
// centered -- nothing about the logo itself ever moves, scales, or
// transitions, while the splash is displayed or while it exits. The only
// motion anywhere in this component is a very short, understated fade of
// the WHOLE overlay -- background and logo together, as one layer, via a
// single opacity transition on .splash-overlay itself (see styles.css) --
// once the visitor clicks. The logo does not fade or move on its own; it
// simply disappears along with everything else because it's inside the
// one element that's fading, not because anything targets it
// individually.
//
// Three states instead of two: idle (fully opaque, waiting for a click),
// exiting (the fade is playing, via the .splash-overlay--exiting class),
// and gone (unmounted). The exiting -> gone transition is driven by the
// CSS transition's own onTransitionEnd event, so the unmount happens
// exactly when the fade visually finishes rather than on a separately
// tuned JS timer. EXIT_FALLBACK_MS is a safety net only, in case that
// event never fires for some reason -- without it, a missed event would
// leave the splash stuck fully transparent but still mounted, still
// intercepting clicks. Its value must stay comfortably above
// styles.css's own `.splash-overlay { transition: opacity ... }`
// duration; keep the two in sync if either changes.
//
// Markup and classes are otherwise unchanged from the previous version
// (.splash-overlay / .splash-overlay__bg / .splash-logo-wrap /
// .splash-logo, see styles.css) so the visual language -- background
// color, logo size, centering -- carries over exactly.
const EXIT_FALLBACK_MS = 460; // CSS duration (400ms) + a small safety margin

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
