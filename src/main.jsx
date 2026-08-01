import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Router from "./Router";
import SplashScreen from "./SplashScreen";
import { loadArchiveItems } from "./content";
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
function Root() {
  const [isRepositoryReady, setIsRepositoryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadArchiveItems().finally(() => {
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
