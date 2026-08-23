// Mobile Header/Search/Menu Refinement Pass -- Section 6 (Haptic Feedback):
// a tiny, dependency-free wrapper around the standard navigator.vibrate()
// API. This is the ONLY place in the codebase that ever calls
// navigator.vibrate -- every call site elsewhere (Header.jsx, App.jsx,
// HoverOverlay.jsx) goes through one of the two named helpers below rather
// than touching the raw API itself, so there is exactly one place that
// knows how to fail safely.
//
// Progressive enhancement only, per the approved plan: navigator.vibrate is
// absent on iOS Safari (and various other browsers/platforms), and even
// where it exists a call can be ignored or throw depending on permissions,
// page-visibility state, or platform quirks. Every path through this file
// is wrapped so an unsupported/blocked call is a silent no-op -- never a
// console error, never a thrown exception that could interrupt the touch
// interaction it was only ever meant to accent. No dependency, no native
// library: this is the bare Web API, feature-detected.
function vibrate(pattern) {
  try {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate !== "function") return;
    navigator.vibrate(pattern);
  } catch {
    // Deliberately silent -- see this file's own header comment.
  }
}

// Open/close a mobile overlay (Search or Menu), or any other simple,
// discrete touch-state toggle (a genuine Archive image inspection tap, a
// zoom +/- press). A bare, single, very short tick -- not a buzz -- so it
// reads as an acknowledgement of the touch, never as an alert.
export function hapticTap() {
  vibrate(8);
}

// Committing a meaningful selection: a filter/search option, a typed
// search submit, a Theme pick from an inspection card, an explicit "View
// Project" tap. A very slightly more pronounced two-tick pattern than
// hapticTap -- so a successful commit reads as subtly distinct from a
// plain open/close -- without becoming a second, separate vibration
// language. Still well under 50ms total, per "keep this minimal."
export function hapticSelect() {
  vibrate([10, 20, 10]);
}
