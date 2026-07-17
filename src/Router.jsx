import App from "./App";
import AboutPage from "./AboutPage";
import ProjectsPage from "./ProjectsPage";
import JournalPage from "./JournalPage";
import { useCurrentPath } from "./navigation";

// The entire routing surface this site needs right now: the gallery at
// "/", the About page at "/about", the (not yet linked from the
// homepage) Projects page at "/projects", and the Journal at "/journal".
// Not a general-purpose router -- just enough to pick one of a small
// number of top-level pages based on the current path. Another static
// page later is one more path check here, not a new dependency.
export default function Router() {
  const path = useCurrentPath();

  if (path === "/about") {
    return <AboutPage />;
  }

  if (path === "/projects") {
    return <ProjectsPage />;
  }

  if (path === "/journal") {
    return <JournalPage />;
  }

  return <App />;
}
