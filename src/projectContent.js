// Content layer seam (Frontend <-> CMS handshake, Phase 1): no longer a
// direct import of the mock data files -- see src/content/. Today
// getProjects()/getArchiveItems() are a pure passthrough to the same
// mock arrays, so behavior in this file is unchanged.
//
// Surgical CMS/Frontend Visibility Audit + Fix: getVisibleItemsForProject
// below reads getAllArchiveItemsIncludingHidden(), not getArchiveItems() --
// see content/archiveItems.js's own comment on why the two now diverge.
// A Project's own image list must still include its Hidden items; only
// the main Archive (everything reading plain getArchiveItems()) excludes
// them.
import { getProjects, getAllArchiveItemsIncludingHidden } from "./content";

// The CMS-agnostic boundary described in the Content Contract: everything
// above this file -- ProjectTemplate and its children -- only ever sees
// the shapes returned below (matching the contract's "Project Object").
// Swapping mock data for real Sanity queries later means rewriting the
// bodies of these functions (and likely making them async, once there's
// an actual network call to await) -- nothing that calls them, and no
// component's props, needs to change.

function getVisibleItemsForProject(slug) {
  // Surgical CMS/Frontend Visibility Audit + Fix (correction): this used
  // to also filter out `displayRole === "Hidden"` here, under the
  // rationale (see git history) that "Hidden Archive Items should not
  // appear in public navigation" / "should not be publicly accessible
  // through direct URLs" -- treating Hidden as hidden everywhere. That
  // was never the CMS's own intended meaning for this field: Hidden means
  // excluded from the main procedural Archive specifically (now enforced
  // at that boundary instead -- see content/archiveItems.js's
  // getArchiveItems()), not hidden from the Project it belongs to. A
  // Project's own gallery -- Image Navigation, the ?image= deep-link
  // resolution below, ProjectInfoPanel -- is exactly where a Hidden image
  // is still meant to be visible, so this function now reads
  // getAllArchiveItemsIncludingHidden() and no longer excludes Hidden
  // items itself. Still filters by project and still sorts by sortOrder,
  // unchanged.
  return getAllArchiveItemsIncludingHidden()
    .filter((item) => item.project === slug)
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
// getProjectBySlug) and the Archive Number requested via the URL's
// ?image= param, if any. Falls through to Featured, then to the lowest
// sortOrder, so a missing or invalid image id always still resolves to
// something real rather than a blank state.
//
// Surgical CMS/Frontend Visibility Audit + Fix (correction): the comment
// here used to say a Hidden item's Archive Number "won't be found in
// project.images at all," making it unreachable via a direct URL --
// true back when getVisibleItemsForProject excluded Hidden items itself,
// but no longer accurate now that it doesn't (see that function's own
// corrected comment). A Hidden image is a real member of project.images
// today, exactly like Default/Featured, so `requested` above can resolve
// to one -- an explicit direct link/nav-arrow step onto a Hidden image is
// exactly the "still navigable inside the Project carousel" behavior this
// field is meant to keep. Only unchanged from before.
//
// One Small Visibility Semantics Follow-up: the FALLBACK tiers below (no
// explicit request, or the requested id wasn't found) are different from
// the explicit-request case just above -- these decide what a visitor
// (or the Projects-index thumbnail, which calls this same function with
// requestedArchiveNumber: null -- see ProjectsPage.jsx's
// getProjectThumbnailSrc) sees as this Project's REPRESENTATIVE image
// with no explicit choice involved. Per the CMS's own intended meaning,
// Hidden is eligible inside the carousel once you're in the Project, but
// was never meant to be eligible as that representative pick merely for
// lack of a Featured item -- so the lowest-sortOrder fallback now skips
// Hidden items (project.images is already sortOrder-ascending, from
// getVisibleItemsForProject, so the first non-Hidden entry found is the
// lowest-sortOrder eligible one). If a Project has no Featured image and
// every one of its images is Hidden, there is no eligible representative
// at all -- falling back to project.images[0] even then (rather than
// returning null) is the same "always resolve to something real instead
// of a blank state" guarantee this function has always made; it does not
// reintroduce Hidden filtering into the carousel itself, which still
// receives every item in project.images unfiltered.
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

  const lowestSortOrderVisible = project.images.find(
    (item) => item.displayRole !== "Hidden",
  );
  if (lowestSortOrderVisible) return lowestSortOrderVisible.archiveNumber;

  return project.images[0].archiveNumber;
}
