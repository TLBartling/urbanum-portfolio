// Mock Project documents, shaped exactly like the Frontend <-> CMS Content
// Contract's Project Object (Urbanum Content Model v1.0): title, slug,
// description, location, dates, sortOrder. This is what a Sanity query for
// the `project` document type is expected to return -- swapping the data
// source later means replacing how PROJECTS is produced, not anything that
// reads it.
//
// Projects intentionally carry no image data of their own ("Projects do
// not own images" -- the CMS Archive Item is the thing that references a
// Project, not the other way around). The join to Archive Items happens in
// projectContent.js, mirroring how a real CMS query would resolve that
// relationship.
//
// sortOrder is the CMS-defined ordering Previous/Next Project navigation
// follows -- deliberately not alphabetical and not the order these are
// listed here, so that requirement is actually exercised rather than
// happening to hold by coincidence.
export const PROJECTS = [
  {
    title: "57 Icon Tower",
    slug: "57-icon-tower",
    description:
      "A mixed-use residential tower organized around a public ground-level plaza, threading pedestrian movement beneath the building rather than around it.",
    location: "Miami, Florida, USA",
    dates: "2023 – 2026",
    sortOrder: 2,
  },
  {
    title: "Northbank Quarter",
    slug: "northbank-quarter",
    description:
      "A low-rise commercial district reworking a former industrial waterfront into a pedestrian-first mixed-use quarter.",
    location: "Portland, Oregon, USA",
    dates: "2021 – 2024",
    sortOrder: 1,
  },
  {
    title: "Vale Street Studio",
    slug: "vale-street-studio",
    description:
      "A small studio and gallery addition to an existing residential property, built around a single reused masonry wall.",
    location: "Austin, Texas, USA",
    dates: "2025",
    sortOrder: 3,
  },
  // Added in the Prototype Metadata Population commit (Commit 3.5),
  // alongside the matching Archive Items in mockArchiveItems.js -- needed
  // so those items' `project` links actually resolve to a real Project
  // page, rather than the "not found" state getProjectBySlug returns for
  // an unknown slug. Same shape as the three above.
  {
    title: "Harbor View Commons",
    slug: "harbor-view-commons",
    description:
      "A civic waterfront commons reclaiming a stretch of working harbor for public gathering, framed by a continuous covered promenade.",
    location: "Baltimore, Maryland, USA",
    dates: "2022 – 2025",
    sortOrder: 4,
  },
  {
    title: "Elm Grove Campus",
    slug: "elm-grove-campus",
    description:
      "A small liberal-arts campus expansion organized around a sequence of shaded courtyards linking existing and new academic buildings.",
    location: "Ann Arbor, Michigan, USA",
    dates: "2022 – 2025",
    sortOrder: 5,
  },
  {
    title: "Kestrel House",
    slug: "kestrel-house",
    description:
      "A ground-up-feeling renovation of a derelict rowhouse, keeping its brick shell and timber structure while reorganizing the interior around a new stair.",
    location: "Philadelphia, Pennsylvania, USA",
    dates: "2023 – 2026",
    sortOrder: 6,
  },
  {
    title: "Meridian Civic Hall",
    slug: "meridian-civic-hall",
    description:
      "A competition-winning civic hall reasserting a small city's public realm, wrapping a double-height hall in a load-bearing concrete colonnade.",
    location: "Richmond, Virginia, USA",
    dates: "2022 – 2026",
    sortOrder: 7,
  },
];
