import { useState } from "react";
import Header from "./Header";
import { allImages } from "./App";

// The studio's About page -- an extension of the homepage's own reading
// language rather than a conventional "about us" page. A narrow intro
// column (name/location/established, a generous gap, and a short editorial
// statement) sits beside a two-row image grid that carries the page --
// images are the dominant feature, each labelled with only a stylized
// archive number, no titles, clients, categories, or tags. A full-width
// footer below closes the page with three short editorial text blocks
// and, past a vertical rule, the studio's contact details.
//
// The `images` prop is the CMS seam: six placeholder entries below fill
// the grid's six fixed slots (three per row) until the studio's own
// photography is wired up, following the same prop-default pattern
// Header.jsx already uses for its MOCK_THEMES/etc. Swapping in real
// images later means passing a differently-populated `images` array of
// the same shape -- nothing here needs to change structurally.
const PLACEHOLDER_IMAGES = [
  { number: "002", src: allImages[2] },
  { number: "008", src: allImages[8] },
  { number: "013", src: allImages[13] },
  { number: "019", src: allImages[19] },
  { number: "021", src: allImages[21] },
  { number: "030", src: allImages[30] },
];

const FOOTER_COLUMNS = [
  {
    label: "Our Philosophy",
    text: "Good architecture is measured by how well it serves the people who use it -- quietly, and for a long time.",
  },
  {
    label: "Our Practice",
    text: "Every project begins with the site itself: its light, its climate, its history.",
  },
  {
    label: "Our Process",
    text: "Clarity comes through collaboration, curiosity, and a deep respect for context.",
  },
];

const CONTACT_FIELDS = [
  { label: "Email", value: "hello@urbanumstudio.com" },
  { label: "Phone", value: "+1 (305) 555-0123" },
  { label: "Instagram", value: "@urbanumstudio" },
  { label: "Location", value: "Miami, Florida" },
];

function StudioImage({ number, src }) {
  return (
    <div className="studio-image">
      <img
        className="studio-image__img"
        src={src}
        alt={`Archive ${number}`}
        loading="lazy"
        decoding="async"
      />
      <span className="studio-image__number">{number}</span>
    </div>
  );
}

export default function AboutPage({ images = PLACEHOLDER_IMAGES }) {
  // Same drawer-height/opacity wiring App.jsx and ProjectsPage.jsx already
  // use for their own scroll-container, reused as-is so the header's
  // Filter/Search/Menu drawer pushes and dims this page's content the
  // same way it does everywhere else.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  const [row1a, row1b, row1c, row2a, row2b, row2c] = images;

  return (
    <div className="about-page">
      <Header
        onFilterOpenChange={setIsIndexDrawerOpen}
        onDrawerHeightChange={setIndexDrawerHeight}
      />

      <div
        className={`about-content studio-content${
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
        <div className="studio-layout">
          <div className="studio-intro">
            <h1 className="about-hero__title">Urbānum Studio</h1>
            <p className="about-hero__location">Miami, Florida, USA</p>

            <div className="studio-intro__copy">
              <p className="studio-intro__paragraph">
                Urbānum Studio began with a simple premise: that architecture
                should clarify a place, not compete with it. Every project
                starts by listening to its site -- its light, its climate,
                its history -- before a single line is drawn.
              </p>
              <p className="studio-intro__paragraph">
                Our work spans residential, commercial, and urban-scale
                projects across South Florida and beyond. Regardless of
                scale, the same discipline applies: remove what isn&rsquo;t
                necessary, and let what remains carry the weight of the
                design.
              </p>
              <p className="studio-intro__paragraph">
                We work in close collaboration with clients who value
                restraint over spectacle, and architecture that ages well --
                both materially and in memory.
              </p>
            </div>
          </div>

          <div className="studio-composition">
            <div className="studio-grid">
              <div className="studio-grid__row studio-grid__row--one">
                <StudioImage {...row1a} />
                <StudioImage {...row1b} />
                <StudioImage {...row1c} />
              </div>
              <div className="studio-grid__row studio-grid__row--two">
                <StudioImage {...row2a} />
                <StudioImage {...row2b} />
                <StudioImage {...row2c} />
              </div>
            </div>
          </div>
        </div>

        <div className="studio-footer">
          {FOOTER_COLUMNS.map((col) => (
            <div className="studio-footer__col" key={col.label}>
              <span className="studio-footer__label">{col.label}</span>
              <p className="studio-footer__text">{col.text}</p>
            </div>
          ))}

          <div className="studio-footer__divider" aria-hidden="true" />

          <div className="studio-footer__contact">
            <span className="studio-footer__contact-heading">Contact</span>
            <dl className="studio-footer__contact-fields">
              {CONTACT_FIELDS.map(({ label, value }) => (
                <div className="studio-footer__contact-field" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
