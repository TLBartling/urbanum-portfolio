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
];
