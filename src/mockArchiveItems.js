// Mock Archive Item documents, shaped exactly like the Frontend <-> CMS
// Content Contract's Archive Item Object: archiveNumber, image, theme,
// tags, project, title, caption, location, date, displayRole, sortOrder.
// Treat this as though it were already coming from Sanity -- `image` reuses
// the same real image files the homepage gallery already has (the exact
// paths App.jsx's `allImages` also points at), but as plain string literals
// rather than an import from App.jsx: a real CMS record would just be a
// URL, not an index into an unrelated array, and pulling `allImages` in
// here would create a circular import (App.jsx already imports from this
// file, below). The records themselves are authored fresh against the
// contract's shape rather than adapted from image-metadata.json, which
// only ever described physical image dimensions and has no concept of
// Projects, Themes, or Archive Numbers.
//
// `sortOrder` here is scoped within a project (it decides the order Image
// Navigation moves through a single project's images), separate from
// Project.sortOrder in mockProjects.js, which orders Projects themselves.
//
// AR-0004 is deliberately marked Hidden -- a real record with a real
// Archive Number, but expected to be excluded from Image Navigation and
// unreachable via a direct ?image= link, exercising both parts of "Hidden
// Archive Items should not appear in public navigation" / "should not be
// publicly accessible through direct URLs" rather than leaving that path
// untested by omission.
export const ARCHIVE_ITEMS = [
  {
    archiveNumber: "AR-0001",
    image: "/img/pexels-adrien-olichon-1257089-3137038.jpg",
    theme: "Residential",
    tags: ["tower", "facade"],
    project: "57-icon-tower",
    title: "Ground Plaza Approach",
    caption: "The tower's base opens onto a public plaza rather than a lobby.",
    location: "Miami, Florida, USA",
    date: "2026",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0002",
    image: "/img/pexels-adrien-olichon-1257089-3137047.jpg",
    theme: "Residential",
    tags: ["tower", "landscape"],
    project: "57-icon-tower",
    title: "Courtyard Canopy",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0003",
    image: "/img/pexels-airamdphoto-27675599.jpg",
    theme: "Residential",
    tags: ["tower", "interior"],
    project: "57-icon-tower",
    title: "Lobby Threshold",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0004",
    image: "/img/pexels-andrea-238542097-35392198.jpg",
    theme: "Residential",
    tags: ["tower", "balcony"],
    project: "57-icon-tower",
    title: "Balcony Study",
    displayRole: "Hidden",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0005",
    image: "/img/pexels-artbovich-11701113.jpg",
    theme: "Residential",
    tags: ["tower", "massing"],
    project: "57-icon-tower",
    title: "East Elevation",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0006",
    image: "/img/pexels-artbovich-7166645.jpg",
    theme: "Commercial",
    tags: ["waterfront", "masterplan"],
    project: "northbank-quarter",
    title: "Quarter Overview",
    caption: "The masterplan reopens the waterfront edge to public access.",
    location: "Portland, Oregon, USA",
    date: "2024",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0007",
    image: "/img/pexels-artbovich-7195739.jpg",
    theme: "Commercial",
    tags: ["waterfront"],
    project: "northbank-quarter",
    title: "Market Hall",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0008",
    image: "/img/pexels-costa-17729218.jpg",
    theme: "Commercial",
    tags: ["waterfront", "landscape"],
    project: "northbank-quarter",
    title: "Promenade",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0009",
    image: "/img/pexels-ezgi-arslanturk-karaman-48519538-11195363.jpg",
    theme: "Commercial",
    tags: ["waterfront", "material"],
    project: "northbank-quarter",
    title: "Timber Detail",
    displayRole: "Default",
    sortOrder: 4,
  },

  {
    archiveNumber: "AR-0010",
    image: "/img/pexels-francesco-ungaro-2058168.jpg",
    theme: "Residential",
    tags: ["studio", "material"],
    project: "vale-street-studio",
    title: "Reused Wall",
    caption: "The single masonry wall the addition was designed around.",
    location: "Austin, Texas, USA",
    date: "2025",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0011",
    image: "/img/pexels-ganiyevart-15153700.jpg",
    theme: "Residential",
    tags: ["studio"],
    project: "vale-street-studio",
    title: "Gallery Light",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0012",
    image: "/img/pexels-itskhalidkhan-6259182.jpg",
    theme: "Residential",
    tags: ["studio", "interior"],
    project: "vale-street-studio",
    title: "Working Table",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0013",
    image: "/img/pexels-ivan-s-4458200.jpg",
    theme: "Residential",
    tags: ["studio", "exterior"],
    project: "vale-street-studio",
    title: "Garden Face",
    displayRole: "Default",
    sortOrder: 4,
  },
];

// The one place the homepage (App.jsx) needs to reach into this mock data:
// "does this gallery image happen to belong to a Project, and if so what's
// its Archive Number/Project slug." A lookup, not a page-level query, so it
// deliberately doesn't go through projectContent.js's adapter -- that
// module resolves a full Project page; this just answers an existence
// check for wiring up homepage clicks.
export function findArchiveItemBySrc(src) {
  return ARCHIVE_ITEMS.find((item) => item.image === src) ?? null;
}
