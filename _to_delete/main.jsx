import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Router from "./Router";
import SplashScreen from "./SplashScreen";
import { loadArchiveItems, loadProjects, loadThemes } from "./content";
import "./styles.css";

// Repository milestone (startup-experience fix): Archive Items come from
// Sanity (see src/content/archiveItems.js), and loading them is a real,
// async network call. An earlier version of this file awaited that load
// before calling ReactDOM's render() at all -- which also delayed
// SplashScreen's own mount, producing a blank white screen before the
// splash animation could even begin. SplashScreen used to mount
// immediately; this restores that.
//
// The fix: mount immediately, always -- SplashScreen's animation begins
// on the very first paint, exactly as it did before Archive Items went
// live. loadArchiveItems() starts in the background, in parallel, while
// that animation plays. Only <Router /> -- the thing that actually
// renders App.jsx, ProjectTemplate, and everything else that reads
// Archive Items -- waits for that load to finish first. That's the
// smallest gate that guarantees the repository is warm by the time any
// Archive-Item-consuming component ever mounts, without pushing any
// asynchrony into App.jsx or the archive procedural composition system:
// this gate doesn't know anything about Sanity or mock data, it just
// waits on the one promise src/content already exposes.
//
// Phase 3 (Connect Projects): loadProjects() joins the same gate via
// Promise.all, run concurrently with loadArchiveItems() rather than
// after it, so this doesn't add to the wait. Projects needed this same
// gate for a stricter reason than Archive Items did -- see
// src/content/projects.js's own comment on why one Project reader
// (App.jsx's Filter-category consts) had to move inside the App()
// component to even be able to rely on this gate at all.
//
// Phase 4 (Connect Themes): loadThemes() joins the same Promise.all for
// the same reason loadProjects() did -- App.jsx reads getThemes() at
// render time now (see App.jsx's own comment at that call site), so the
// cache needs to already be warm by then.
function Root() {
  const [isRepositoryReady, setIsRepositoryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadArchiveItems(), loadProjects(), loadThemes()]).finally(() => {
      if (!cancelled) setIsRepositoryReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SplashScreen />
      {isRepositoryReady && <Router />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
