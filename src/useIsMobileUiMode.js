import { useEffect, useState } from "react";

// Mobile Archive Interaction Pass -- Canonical Mobile/Touch Signals: this is
// the LAYOUT/BREAKPOINT signal, deliberately kept in its own file and
// separate from App.jsx's useIsTouchDevice() (a pointer/hover CAPABILITY
// signal). The two answer different questions and are used for different
// decisions across this pass:
//
//   useIsMobileUiMode (this hook) -- "should this render use the mobile UI
//   layout?" -- drives the mobile Search/discovery overlay, hiding the
//   desktop Filter button, the mobile header structure, mobile Archive
//   presentation calibration (header/footer clearance, default camera
//   scale), and mobile content-page spacing (Menu default-closed, content
//   offset).
//
//   useIsTouchDevice (App.jsx) -- "does this device have touch/no-hover
//   input?" -- drives the Relationship Engine disable, touch inspection
//   behavior, and pinch/pan gesture handling.
//
// A narrow desktop browser window and a large touch tablet can disagree on
// these two questions (the former trips this hook but not
// useIsTouchDevice; the latter can trip useIsTouchDevice while staying wide
// enough to miss this hook's breakpoint) -- every mobile-only feature in
// this pass picks exactly one of the two, deliberately, rather than
// whichever detector happens to be closest at hand. Keeping them as two
// separate hooks (rather than one hook exporting two booleans) makes it
// impossible for a future call site to silently default to the wrong one.
//
// 640px matches the existing mobile CSS breakpoint already used throughout
// styles.css (`@media (max-width: 640px)`), so "mobile UI mode" in JS and
// "mobile" in the existing stylesheet always agree on where the line is.
// Live via the MediaQueryList's own change event (not just read once at
// mount), same as useIsTouchDevice, so resizing the window or rotating a
// device is reflected immediately.
const MOBILE_UI_QUERY = "(max-width: 640px)";

export function useIsMobileUiMode() {
  const [isMobileUiMode, setIsMobileUiMode] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_UI_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mediaQueryList = window.matchMedia(MOBILE_UI_QUERY);
    const handleChange = (event) => setIsMobileUiMode(event.matches);
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return isMobileUiMode;
}
