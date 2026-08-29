// Content layer seam (Frontend <-> CMS handshake, Phase 1): no longer a
// direct import of the mock data files -- see src/content/. Today
// getProjects()/getArchiveItems() are a pure passthrough to the same
// mock arrays, so behavior in this file is unchanged.
import { getProjects, getArchiveItems } from "./content";

// The CMS-agnostic boundary described in the Content Contract: everything
// above this file -- ProjectTemplate and its children -- only ever sees
// the shapes returned below (matching the contract's "Project Object").
// Swapping mock data for real Sanity queries later means rewriting the
// bodies of these functions (and likely making them async, once there's
// an actual network call to await) -- nothing that calls them, and no
// component's props, needs to change.

function getVisibleItemsForProject(slug) {
  // "Hidden Archive Items should not appear in public navigation" and
  // "should not be publicly accessible through direct URLs" -- both are
  // satisfied by simply never including them in what this function
  // returns, the same way a real Sanity query would filter
  // `displayRole != "Hidden"` server-side rather than send hidden items to
  // the client for the frontend to hide. Everything downstream (Image
  // Navigation, the ?image= deep-link resolution below) only ever sees the
  // already-public list.
  return getArchiveItems()
    .filter((item) => item.project === slug && item.displayRole !== "Hidden")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function getProjectsInOrder() {
  // Previous/Next Project follows the CMS-defined Project.sortOrder, not
  // alphabetical order and not the order getProjects() happens to return
  // them in -- see the comment in mockProjects.js.
  return [...getProjects()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

// The Project Template's one data-loading call. Returns null for an
// unknown slug (ProjectTemplate renders a not-found state in that case)
// rather than throwing, since an invalid/stale slug in a URL is an
// expected condition, not an exceptional one.
export function getProjectBySlug(slug) {
  const project = getProjects().find((p) => p.slug === slug);
  if (!project) return null;

  const ordered = getProjectsInOrder();
  const index = ordered.findIndex((p) => p.slug === slug);
  // Project Navigation Loop: Previous/Next wraps around the ordered list
  // instead of dead-ending at the first/last Project -- the first
  // Project's Previous goes to the last Project, and the last Project's
  // Next goes back to the first. The modulo add-then-wrap (rather than a
  // plain index - 1 / index + 1) is what makes index 0's "previous" wrap
  // to ordered.length - 1 instead of going negative. Both are always
  // non-null now (as long as this Project exists in `ordered`, which it
  // does -- `project` was already found above), including for a
  // single-Project catalog, where a Project simply loops to itself; see
  // ProjectNavigation.jsx, which no longer needs its previousProject/
  // nextProject null-checks to ever actually hide a control, but keeps
  // them as-is since they're now simply always truthy rather than needing
  // to be removed.
  const previous = ordered[(index - 1 + ordered.length) % ordered.length];
  const next = ordered[(index + 1) % ordered.length];

  return {
    title: project.title,
    slug: project.slug,
    description: project.description,
    // CMS typography foundation pass: this was a genuine gap, not new
    // scope -- cms/queries.js's normalizeProject now carries
    // descriptionRichText (added alongside the Project schema's own new
    // richText field, see projectType.js), but this function (the one
    // seam ProjectTemplate/ProjectInfoPanel actually read through) was
    // never forwarding it, so the rich field could never reach the page
    // no matter what an editor put in Sanity. Same plain pass-through
    // treatment as every other field here.
    descriptionRichText: project.descriptionRichText,
    location: project.location,
    dates: project.dates,
    // Data-flow correction (Josh review, final polish pass): Project.year
    // is a real schema/query field (see cms/queries.js's PROJECTS_QUERY
    // and normalizeProject) that simply wasn't being carried through this
    // function -- ProjectInfoPanel.jsx now renders it as the Year line in
    // its identity block, the same pass-through treatment every other
    // Project field on this line already gets.
    year: project.year,
    images: getVisibleItemsForProject(slug),
    // previousProject/nextProject are handed down as {slug, title} rather
    // than full Project objects -- enough to render a nav link without a
    // second fetch, and avoids embedding a project's full data inside
    // another project's payload.
    previousProject: previous
      ? { slug: previous.slug, title: previous.title }
      : null,
    nextProject: next ? { slug: next.slug, title: next.title } : null,
  };
}

// Decides which image ProjectTemplate shows first, given a Project (from
// getProjectBySlug, so already Hidden-filtered) and the Archive Number
// requested via the URL's ?image= param, if any. Falls through to
// Featured, then to the lowest sortOrder, so a missing, invalid, or Hidden
// image id always still resolves to something real rather than a blank
// state -- a Hidden item's Archive Number simply won't be found in
// `project.images` at all, which is what makes it unreachable via a direct
// URL without any separate hidden-item check here.
export function resolveInitialImageId(project, requestedArchiveNumber) {
  if (!project || project.images.length === 0) return null;

  const requested = requestedArchiveNumber
    ? project.images.find(
        (item) => item.archiveNumber === requestedArchiveNumber,
      )
    : null;
  if (requested) return requested.archiveNumber;

  const featured = project.images.find(
    (item) => item.displayRole === "Featured",
  );
  if (featured) return featured.archiveNumber;

  return project.images[0].archiveNumber;
}
