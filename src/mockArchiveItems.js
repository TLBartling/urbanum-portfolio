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
// Prototype Metadata Population (Commit 3.5): every one of App.jsx's 35
// `allImages` now has a matching Archive Item here (up from the original
// 13), across 7 projects, so the Relationship Engine, HoverOverlay, and
// future Filter/Search/opacity work all have a realistic, overlapping
// dataset to exercise -- not just the handful of records that existed
// before. `date` continues to be used exactly as it already was (a bare
// year string); nothing about that field's name or shape changed.
//
// `theme` (singular) is untouched -- every existing consumer
// (relationshipEngine.js's RELATIONSHIP_FIELDS, and the
// `item.theme ? [item.theme] : []` mapping at HoverOverlay's call site in
// App.jsx) still reads this exact field and keeps working unchanged. Every
// item's `theme` is simply its first, primary `themes` entry, same value
// as before for the original 13 records.
//
// `themes` (plural, new) is additive: every item now carries at least two,
// giving a richer picture of each image than the single `theme` field
// alone can hold. Nothing reads `themes` yet -- it's populated now so a
// future commit can move HoverOverlay/the Relationship Engine over to it,
// the same way galleryGenerationRef and relatedArchiveNumbersRef were each
// populated ahead of the commit that first consumed them.
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
    themes: ["Residential", "Interior"],
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
    themes: ["Residential", "Urban Strategy"],
    tags: ["tower", "landscape"],
    project: "57-icon-tower",
    title: "Courtyard Canopy",
    date: "2025",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0003",
    image: "/img/pexels-airamdphoto-27675599.jpg",
    theme: "Residential",
    themes: ["Residential", "Interior", "Urban Strategy"],
    tags: ["tower", "interior"],
    project: "57-icon-tower",
    title: "Lobby Threshold",
    date: "2024",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0004",
    image: "/img/pexels-andrea-238542097-35392198.jpg",
    theme: "Residential",
    themes: ["Residential", "Interior"],
    tags: ["tower", "facade", "threshold"],
    project: "57-icon-tower",
    title: "Balcony Study",
    date: "2023",
    displayRole: "Hidden",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0005",
    image: "/img/pexels-artbovich-11701113.jpg",
    theme: "Residential",
    themes: ["Residential", "Urban Strategy"],
    tags: ["tower", "structure"],
    project: "57-icon-tower",
    title: "East Elevation",
    date: "2025",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0006",
    image: "/img/pexels-artbovich-7166645.jpg",
    theme: "Commercial",
    themes: ["Commercial", "Public Space"],
    tags: ["waterfront", "masterplan", "historic"],
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
    themes: ["Commercial", "Landscape"],
    tags: ["waterfront", "public"],
    project: "northbank-quarter",
    title: "Market Hall",
    date: "2023",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0008",
    image: "/img/pexels-costa-17729218.jpg",
    theme: "Commercial",
    themes: ["Commercial", "Public Space", "Landscape"],
    tags: ["waterfront", "landscape"],
    project: "northbank-quarter",
    title: "Promenade",
    date: "2022",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0009",
    image: "/img/pexels-ezgi-arslanturk-karaman-48519538-11195363.jpg",
    theme: "Commercial",
    themes: ["Commercial", "Public Space"],
    tags: ["waterfront", "material"],
    project: "northbank-quarter",
    title: "Timber Detail",
    date: "2024",
    displayRole: "Default",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0014",
    image: "/img/pexels-artbovich-8089093.jpg",
    theme: "Commercial",
    themes: ["Commercial", "Landscape"],
    tags: ["waterfront", "public", "masterplan"],
    project: "northbank-quarter",
    title: "Warehouse Edge",
    date: "2023",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0010",
    image: "/img/pexels-francesco-ungaro-2058168.jpg",
    theme: "Residential",
    themes: ["Residential", "Adaptive Reuse"],
    tags: ["renovation", "material"],
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
    theme: "Adaptive Reuse",
    themes: ["Adaptive Reuse", "Material Study"],
    tags: ["renovation", "interior", "timber"],
    project: "vale-street-studio",
    title: "Gallery Light",
    date: "2024",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0012",
    image: "/img/pexels-itskhalidkhan-6259182.jpg",
    theme: "Residential",
    themes: ["Residential", "Material Study"],
    tags: ["material", "interior"],
    project: "vale-street-studio",
    title: "Working Table",
    date: "2025",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0013",
    image: "/img/pexels-ivan-s-4458200.jpg",
    theme: "Residential",
    themes: ["Residential", "Adaptive Reuse", "Material Study"],
    tags: ["renovation", "structure"],
    project: "vale-street-studio",
    title: "Garden Face",
    date: "2026",
    displayRole: "Default",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0015",
    image: "/img/pexels-ai25studio-8837511.jpg",
    theme: "Adaptive Reuse",
    themes: ["Adaptive Reuse", "Material Study"],
    tags: ["material", "renovation"],
    project: "vale-street-studio",
    title: "Material Palette",
    date: "2024",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0016",
    image: "/img/pexels-googledeepmind-25626446.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Landscape"],
    tags: ["waterfront", "public", "community"],
    project: "harbor-view-commons",
    title: "Promenade Approach",
    caption:
      "A covered promenade turns the harbor's working edge into a public room.",
    location: "Baltimore, Maryland, USA",
    date: "2023",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0017",
    image: "/img/pexels-ivan-s-4458205.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Urban Strategy"],
    tags: ["public", "civic"],
    project: "harbor-view-commons",
    title: "Public Steps",
    date: "2022",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0018",
    image: "/img/pexels-jonas-horsch-102497290-34303572.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Landscape", "Urban Strategy"],
    tags: ["waterfront", "masterplan", "public"],
    project: "harbor-view-commons",
    title: "Harbor Masterplan",
    date: "2024",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0019",
    image: "/img/pexels-laup-1816030.jpg",
    theme: "Landscape",
    themes: ["Landscape", "Urban Strategy"],
    tags: ["community", "courtyard", "threshold"],
    project: "harbor-view-commons",
    title: "Community Courtyard",
    date: "2023",
    displayRole: "Default",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0020",
    image: "/img/pexels-macit-abdullah-2152400408-33643463.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Landscape"],
    tags: ["waterfront", "public", "landscape"],
    project: "harbor-view-commons",
    title: "Waterline Edge",
    date: "2025",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0021",
    image: "/img/pexels-magda-ehlers-pexels-35009410.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Material Study"],
    tags: ["campus", "public", "museum"],
    project: "elm-grove-campus",
    title: "Quad Entry",
    caption:
      "The quad's shaded entry threads new construction between two existing halls.",
    location: "Ann Arbor, Michigan, USA",
    date: "2022",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0022",
    image: "/img/pexels-perqued-10919427.jpg",
    theme: "Material Study",
    themes: ["Material Study", "Landscape"],
    tags: ["campus", "material"],
    project: "elm-grove-campus",
    title: "Material Study Wall",
    date: "2023",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0023",
    image: "/img/pexels-perqued-9757618.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Landscape"],
    tags: ["campus", "courtyard", "glass"],
    project: "elm-grove-campus",
    title: "Courtyard Glass",
    date: "2024",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0024",
    image: "/img/pexels-pixels-elements-16627387.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Material Study", "Landscape"],
    tags: ["campus", "material", "structure", "glass"],
    project: "elm-grove-campus",
    title: "Structural Frame",
    date: "2022",
    displayRole: "Default",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0025",
    image: "/img/pexels-pth686817-20588914.jpg",
    theme: "Material Study",
    themes: ["Material Study", "Public Space"],
    tags: ["campus", "public", "landscape"],
    project: "elm-grove-campus",
    title: "Campus Green",
    date: "2025",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0026",
    image: "/img/pexels-rethaferguson-3825540.jpg",
    theme: "Residential",
    themes: ["Residential", "Adaptive Reuse"],
    tags: ["housing", "renovation"],
    project: "kestrel-house",
    title: "Rowhouse Facade",
    caption:
      "The rowhouse's brick shell was kept entirely intact; everything behind it is new.",
    location: "Philadelphia, Pennsylvania, USA",
    date: "2025",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0027",
    image: "/img/pexels-rushipatel1210-32654150.jpg",
    theme: "Adaptive Reuse",
    themes: ["Adaptive Reuse", "Interior"],
    tags: ["housing", "adaptive reuse", "brick"],
    project: "kestrel-house",
    title: "Brick Retained",
    date: "2026",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0028",
    image: "/img/pexels-shvets-production-9052461.jpg",
    theme: "Residential",
    themes: ["Residential", "Interior"],
    tags: ["housing", "interior", "timber"],
    project: "kestrel-house",
    title: "Timber Stair",
    date: "2024",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0029",
    image: "/img/pexels-sliceisop-2739074.jpg",
    theme: "Residential",
    themes: ["Residential", "Adaptive Reuse", "Interior"],
    tags: ["renovation", "adaptive reuse", "interior"],
    project: "kestrel-house",
    title: "Interior Reveal",
    date: "2025",
    displayRole: "Default",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0030",
    image: "/img/pexels-srcharls-35614239.jpg",
    theme: "Adaptive Reuse",
    themes: ["Adaptive Reuse", "Interior"],
    tags: ["housing", "brick", "renovation"],
    project: "kestrel-house",
    title: "Renovated Threshold",
    date: "2023",
    displayRole: "Default",
    sortOrder: 5,
  },

  {
    archiveNumber: "AR-0031",
    image: "/img/pexels-thomas-parker-1272388137-31500951.jpg",
    theme: "Urban Strategy",
    themes: ["Urban Strategy", "Public Space"],
    tags: ["civic", "public", "urban", "concrete"],
    project: "meridian-civic-hall",
    title: "Colonnade Approach",
    caption:
      "A concrete colonnade wraps the hall, doubling as covered public arcade.",
    location: "Richmond, Virginia, USA",
    date: "2026",
    displayRole: "Featured",
    sortOrder: 1,
  },
  {
    archiveNumber: "AR-0032",
    image: "/img/pexels-tima-miroshnichenko-6615234.jpg",
    theme: "Urban Strategy",
    themes: ["Urban Strategy", "Interior"],
    tags: ["civic", "structure", "historic", "competition"],
    project: "meridian-civic-hall",
    title: "Historic Context",
    date: "2025",
    displayRole: "Default",
    sortOrder: 2,
  },
  {
    archiveNumber: "AR-0033",
    image: "/img/pexels-unlime-8262182.jpg",
    theme: "Public Space",
    themes: ["Public Space", "Interior"],
    tags: ["public", "museum", "civic", "concrete"],
    project: "meridian-civic-hall",
    title: "Civic Hall Interior",
    date: "2024",
    displayRole: "Default",
    sortOrder: 3,
  },
  {
    archiveNumber: "AR-0034",
    image: "/img/pexels-yunuserentk-10026713.jpg",
    theme: "Urban Strategy",
    themes: ["Urban Strategy", "Public Space", "Interior"],
    tags: ["urban", "competition", "civic"],
    project: "meridian-civic-hall",
    title: "Competition Model",
    date: "2026",
    displayRole: "Default",
    sortOrder: 4,
  },
  {
    archiveNumber: "AR-0035",
    image: "/img/pexels-zulfugarkarimov-33719839.jpg",
    theme: "Urban Strategy",
    themes: ["Urban Strategy", "Public Space"],
    tags: ["civic", "public", "structure"],
    project: "meridian-civic-hall",
    title: "Public Steps South",
    date: "2022",
    displayRole: "Default",
    sortOrder: 5,
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
