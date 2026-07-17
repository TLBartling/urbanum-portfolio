import { useEffect, useState } from "react";

// Minimal hand-rolled client-side navigation -- just enough to switch
// between the gallery and a small number of static pages (About today)
// without a full page reload or pulling in a routing library. This file
// has no dependency on any page component (App, Header, AboutPage) on
// purpose, so anything can import navigate()/useCurrentPath() without
// risking a circular import; Router.jsx (which does know about the page
// components) is the only thing that reads useCurrentPath() to decide
// what to render.
function getCurrentPath() {
  return window.location.pathname;
}

// history.pushState alone doesn't fire a popstate event -- that only
// happens on back/forward -- so this dispatches one manually right after,
// which is what lets useCurrentPath() (and anything else listening for
// popstate) notice the change immediately.
export function navigate(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useCurrentPath() {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => setPath(getCurrentPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return path;
}

// A minimal, ephemeral channel for handing a header intent (which control to
// resume as active on arrival, plus any typed-but-unsubmitted text) across a
// return trip to the homepage. Filter and Search both resolve on the
// homepage now, regardless of which child page they were invoked from -- this
// is how the freshly mounted homepage Header knows which one to resume. A
// plain module variable is enough: there's no real page load between "a
// child page requests this" and "the homepage Header reads it once on
// mount," so nothing here needs to survive a reload or a browser
// back/forward.
let pendingHomeIntent = null;

export function navigateHomeWithIntent(intent) {
  pendingHomeIntent = intent;
  navigate("/");
}

// Reads and clears the pending intent in one step, so it's consumed exactly
// once by the homepage Header's own mount -- a later, ordinary visit to "/"
// (the logo, a Menu link) never picks up a stale intent.
export function consumePendingHomeIntent() {
  const intent = pendingHomeIntent;
  pendingHomeIntent = null;
  return intent;
}
