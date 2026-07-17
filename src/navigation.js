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
