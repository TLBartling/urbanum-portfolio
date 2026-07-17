import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Logo from "./Logo";

// One quiet gesture in three parts, not a launch: the centered logo rests
// just long enough to register as the site's identity, then begins a
// slow, deliberate move/scale toward the real header logo's measured
// position. The homepage stays fully hidden behind the still-opaque
// overlay for most of that movement -- it only starts emerging in the
// final stretch of the logo's travel, and finishes emerging at the exact
// moment the logo arrives, so the page reads as quietly appearing beneath
// the arriving logo rather than racing it there.
//
// The real Header (with its own real logo) is already mounted normally
// behind this overlay the whole time -- nothing here duplicates or
// reaches into Header.jsx. The splash only needs to know where that real
// logo already is, measured directly from the DOM via
// getBoundingClientRect, so the destination stays exact even if the
// header's own responsive sizing changes later.
//
// power1.inOut rather than the power2/3.out used elsewhere on the site:
// those are tuned for quick UI feedback (a few hundred ms) and have a
// fast opening burst that would read as a "launch" here. This is a
// single, slow, scene-setting transition, not interactive feedback, so
// it gets its own gentler curve -- smooth in, smooth out, nothing that
// calls attention to itself.
const HOLD_DURATION = 0.4; // the quiet breath before any motion begins
const MOVE_DURATION = 1.9; // slower/more deliberate than the original 1.6s
// The reveal only spans the final quarter of the logo's travel, and is
// timed to end at the same moment the move ends -- derived from
// MOVE_DURATION rather than a separate constant, so the two can never
// drift out of sync with each other.
const REVEAL_START_FRACTION = 0.75;
const REVEAL_DURATION = MOVE_DURATION * (1 - REVEAL_START_FRACTION);
const ANIMATION_EASE = "power1.inOut";

// App.jsx mounts a Header-less shell on its very first commit (while its
// gallery data is still empty) and only renders the real Header a commit
// later, once that data arrives. This component's own mount effect fires
// once, immediately, which used to mean it could check for the header
// logo before Header had rendered at all and give up prematurely -- a
// timing mismatch, not a rendering or lifecycle problem. This polls for
// the header logo across a few frames (invisible to the visitor, since
// the opaque overlay is already covering the screen the whole time) and
// proceeds the instant it actually exists. A short timeout still protects
// against hanging if it never shows up for some unrelated reason.
const HEADER_LOGO_WAIT_TIMEOUT = 2000;

export default function SplashScreen() {
  const overlayBgRef = useRef(null);
  const logoWrapRef = useRef(null);
  const [isDone, setIsDone] = useState(false);

  useLayoutEffect(() => {
    const logoWrap = logoWrapRef.current;
    const overlayBg = overlayBgRef.current;

    if (!logoWrap || !overlayBg) {
      setIsDone(true);
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setIsDone(true);
      return undefined;
    }

    let cancelled = false;
    let rafId = null;
    let tl = null;
    const startTime = performance.now();

    const runAnimation = (headerLogo) => {
      const from = logoWrap.getBoundingClientRect();
      const to = headerLogo.getBoundingClientRect();

      // Center-to-center delta, not edge-to-edge -- combined with scaling
      // around the wrap's own default transform-origin (50% 50%), this
      // lands the moved/scaled logo exactly on the real logo's box, at
      // exactly its size, regardless of viewport size.
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const scale = to.width / from.width;

      tl = gsap.timeline({ onComplete: () => setIsDone(true) });
      tl.to(
        logoWrap,
        { x: dx, y: dy, scale, duration: MOVE_DURATION, ease: ANIMATION_EASE },
        HOLD_DURATION
      );
      tl.to(
        overlayBg,
        { opacity: 0, duration: REVEAL_DURATION, ease: ANIMATION_EASE },
        HOLD_DURATION + MOVE_DURATION * REVEAL_START_FRACTION
      );
    };

    const waitForHeaderLogo = () => {
      if (cancelled) return;

      const headerLogo = document.querySelector(".brand");
      if (headerLogo) {
        runAnimation(headerLogo);
        return;
      }

      if (performance.now() - startTime >= HEADER_LOGO_WAIT_TIMEOUT) {
        setIsDone(true);
        return;
      }

      rafId = requestAnimationFrame(waitForHeaderLogo);
    };

    waitForHeaderLogo();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      tl?.kill();
    };
  }, []);

  if (isDone) return null;

  return (
    <div className="splash-overlay">
      <div className="splash-overlay__bg" ref={overlayBgRef} />
      <div className="splash-logo-wrap" ref={logoWrapRef}>
        <Logo className="splash-logo" />
      </div>
    </div>
  );
}
