import { useState } from "react";
import Header from "./Header";
import { allImages } from "./App";

// Reassigned from its original role as the site's About page (see git
// history) to the Projects page, now living at /projects. Not linked from
// the homepage yet -- reachable directly by URL only, pending a decision
// with the client on whether this becomes the permanent Projects page, a
// Featured Projects page, or something else. Composition/layout are
// unchanged from the original: a title/location/established line, an
// asymmetric image composition with numbered captions, a short
// description, and a CLIENT/ARCHITECT/STATUS/PHOTOGRAPHY/TAGS meta panel.
// Images below are drawn from the same pool the gallery already uses (see
// allImages in App.jsx), purely as stand-ins for the studio's own
// photography that will replace them later; the archive numbers/labels
// are what's meant to persist.
const COLUMN_ONE_TILES = [
  { number: "001", label: "Exterior View", year: "2026", src: allImages[0] },
  { number: "003", label: "Facade Detail", year: "2026", src: allImages[6] },
];

const COLUMN_TWO_IMAGE_TILES = [
  { number: "007", label: "Lobby Interior", year: "2026", src: allImages[11] },
  { number: "005", label: "Base Structure", year: "2026", src: allImages[4] },
];

const COLUMN_TWO_STUDY_TILE = {
  number: "010",
  label: "Study Model",
  year: "2026",
  src: allImages[9],
};

const COLUMN_THREE_TILES = [
  { number: "012", label: "Landscape Plaza", year: "2026", src: allImages[24] },
  { number: "014", label: "Aerial View Context", year: "2026", src: allImages[17] },
];

const META_FIELDS = [
  { label: "Client", value: "Private" },
  { label: "Architect", value: "Urbānum Studio" },
  { label: "Status", value: "Established" },
  { label: "Photography", value: "Urbānum Studio" },
];

const TAGS = ["Architecture", "Design", "Residential", "Commercial", "Urban Design"];

function ProjectTile({ number, label, year, src }) {
  return (
    <div className="about-tile">
      <img
        className="about-tile__image"
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
      />
      <div className="about-tile__caption">
        <span className="about-tile__number">{number}</span>
        <span className="about-tile__label">{label}</span>
      </div>
      <span className="about-tile__year">{year}</span>
    </div>
  );
}

export default function ProjectsPage() {
  // Same drawer-height/opacity wiring App.jsx already uses for its own
  // scroll-container, reused as-is so the header's Filter/Search/Menu
  // drawer pushes and dims this page's content the same way it does the
  // gallery, rather than overlaying it differently here.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  return (
    <div className="about-page">
      <Header
        onFilterOpenChange={setIsIndexDrawerOpen}
        onDrawerHeightChange={setIndexDrawerHeight}
      />

      <div
        className={`about-content${
          isIndexDrawerOpen ? " scroll-container--drawer-open" : ""
        }`}
        style={{
          // margin-top, not transform: on a child page the drawer stays
          // open for the whole visit (see Header.jsx), so this offset is
          // steady-state, not a brief animated toggle -- transform's per-
          // frame compositing cost, paid the whole time the page is open,
          // is what caused child-page scrolling to regress. margin-top
          // adds to this element's own existing padding-top via normal
          // document flow (no calc()/clamp duplication needed) and, with
          // no transition declared on it, changes apply instantly rather
          // than animating -- consistent with Menu no longer being a
          // brief, animated interaction here. The homepage keeps its own
          // transform-based push untouched (see App.jsx): Filter/Menu are
          // genuinely frequent, animated toggles there.
          marginTop: indexDrawerHeight
            ? `${Math.round(indexDrawerHeight) + 8}px`
            : undefined,
        }}
      >
        <div className="about-hero">
          <h1 className="about-hero__title">Urbānum Studio</h1>
          <p className="about-hero__location">Miami, Florida, USA</p>
          <p className="about-hero__established">Established 2024</p>
        </div>

        <div className="about-columns">
          <div className="about-column about-column--one">
            {COLUMN_ONE_TILES.map((tile) => (
              <ProjectTile key={tile.number} {...tile} />
            ))}
          </div>

          <div className="about-column about-column--two">
            {COLUMN_TWO_IMAGE_TILES.map((tile) => (
              <ProjectTile key={tile.number} {...tile} />
            ))}
            <div className="about-text-row">
              <ProjectTile {...COLUMN_TWO_STUDY_TILE} />
              <p className="about-description">
                Urbānum Studio is an architecture practice based in Miami,
                Florida. Our work explores space, material, and context
                with clarity and intention, creating architecture that is
                grounded, relevant, and enduring.
              </p>
            </div>
          </div>

          <div className="about-column about-column--three">
            {COLUMN_THREE_TILES.map((tile) => (
              <ProjectTile key={tile.number} {...tile} />
            ))}
            <div className="about-meta">
              <dl className="about-meta__fields">
                {META_FIELDS.map(({ label, value }) => (
                  <div className="about-meta__field" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="about-meta__tags">
                <span className="about-meta__tags-label">Tags</span>
                <ul>
                  {TAGS.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
