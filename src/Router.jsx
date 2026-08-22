import App from "./App";
import AboutPage from "./AboutPage";
import ContactPage from "./ContactPage";
import ProjectsPage from "./ProjectsPage";
import JournalPage from "./JournalPage";
import ProjectTemplate from "./ProjectTemplate";
import { useCurrentPath } from "./navigation";

// Matches "/projects/:slug" and captures the slug -- the one dynamic
// segment this router needs. Deliberately a plain regex rather than a
// routing library: one dynamic pattern doesn't justify a dependency, and
// everything else here is still exact-match.
const PROJECT_ROUTE = /^\/projects\/([^/]+)$/;

// The entire routing surface this site needs right now: the gallery at
// "/", the About page at "/about", the Contact page at "/contact", the
// Projects index at "/projects", the dynamic Project Template at
// "/projects/:slug", and the Journal at "/journal". Not a general-purpose
// router -- just enough to pick one of a small number of top-level pages
// (or one dynamic template) based on the current path. Another static
// page later is one more path check here, not a new dependency -- Contact
// (Contact drawer -> Contact page milestone) is exactly that: one more
// check, mirroring About's own.
export default function Router() {
  const path = useCurrentPath();

  if (path === "/about") {
    return <AboutPage />;
  }

  if (path === "/contact") {
    return <ContactPage />;
  }

  if (path === "/projects") {
    return <ProjectsPage />;
  }

  if (path === "/journal") {
    return <JournalPage />;
  }

  const projectMatch = path.match(PROJECT_ROUTE);
  if (projectMatch) {
    const slug = projectMatch[1];
    // The clicked Archive Item's id travels as a query param (?image=),
    // not through Router/navigation.js's path-only state -- read directly
    // here rather than growing useCurrentPath's contract for one route.
    // key={slug} gives ProjectTemplate a clean remount whenever the
    // Project itself changes (Previous/Next Project), rather than trying
    // to reconcile its internal image-selection state across projects.
    const imageId = new URLSearchParams(window.location.search).get("image");
    return <ProjectTemplate key={slug} slug={slug} imageId={imageId} />;
  }

  return <App />;
}
