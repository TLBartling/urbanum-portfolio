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
//   behavior, and pinch/pan gesture handling. Completely untouched by the
//   pass described below.
//
// Responsive interaction/state audit pass: this hook used to be
// width-only (a flat `(max-width: 640px)`), which meant a genuinely
// touch/no-hover tablet -- an iPad, portrait or landscape -- never
// tripped it at all (every iPad width, either orientation, is well past
// 640px), so it silently received the full desktop UI layout despite
// having no hover and no fine pointer; and a phone rotated to landscape
// (whose own width commonly exceeds 640px too) flipped to desktop layout
// on rotation alone, even though nothing about its actual input
// capability had changed. The query below is now an OR of that original
// width term and the exact capability query useIsTouchDevice already
// uses (`(hover: none) and (pointer: coarse)`) -- reusing an existing,
// already-proven detector, not a new one, and not a user-agent or
// device-name check, and not an iPad-specific branch: any device that is
// genuinely touch/no-hover now gets the mobile UI layout regardless of
// its width, on top of the original narrow-viewport case, which is
// completely unchanged (a fine-pointer/hover-capable laptop or desktop
// browser resized narrow still trips only the width clause, exactly as
// before -- desktop behavior at a given width is unaffected unless the
// device is actually touch/no-hover). This intentionally makes this hook
// agree with useIsTouchDevice far more often now (the "large touch
// tablet" disagreement this file used to call out no longer applies --
// closing exactly that gap is the point of this pass), but they remain
// two separate hooks answering two separate questions per this comment's
// reasoning above: useIsTouchDevice itself is untouched, still
// capability-only, still the signal Archive's own interaction model is
// built on.
//
// 640px still matches the existing mobile CSS breakpoint already used
// throughout styles.css (`@media (max-width: 640px)`) for the
// width-driven half of this query; the Project breadcrumb's own X-vs-
// chevron CSS breakpoint was given the identical capability OR alongside
// this pass (see that rule's own comment in styles.css), so JS and CSS
// keep agreeing on where the line is drawn. Live via the MediaQueryList's
// own change event (not just read once at mount), same as
// useIsTouchDevice, so resizing the window or rotating a device is
// reflected immediately.
const MOBILE_UI_QUERY =
  "(max-width: 640px), (hover: none) and (pointer: coarse)";

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
