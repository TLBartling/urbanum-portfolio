import { useState } from "react";
import Header from "./Header";
import { getJournalEntries } from "./content";

// The Journal is a plain, growing image archive -- three equal columns,
// one fixed aspect ratio, no numbers or click behavior. It's meant to
// read as a quiet visual notebook rather than a portfolio or gallery, so
// the implementation stays deliberately restrained: a CSS grid, plus the
// one small addition below (an optional per-entry hover caption -- see
// .journal-tile__caption in styles.css), and nothing else layered on
// top.
//
// The `entries` prop is the CMS seam, following the same prop-default
// pattern already used by AboutPage/the earlier Journal CMS handshake.
// Journal CMS cleanup: this now carries each entry's full normalized
// shape (`{ image, date, caption }` -- see src/cms/queries.js's
// normalizeJournalEntry) rather than a bare image URL string, since the
// render loop below now also needs `caption` to know whether a given
// tile has one. Renamed from `images` to `entries` to match -- "images"
// stopped being an accurate name the moment this started carrying more
// than plain URLs. `<JournalPage />` (see Router.jsx) is this
// component's only caller and never passes this prop, so the default is
// always what actually renders today.
export default function JournalPage({ entries = getJournalEntries() }) {
  // Same drawer-height/opacity wiring App.jsx, AboutPage.jsx, and
  // ProjectsPage.jsx already use for their own scroll-container, reused
  // as-is so the header's Filter/Search/Menu drawer pushes and dims this
  // page's content the same way it does everywhere else.
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
        <div className="journal-grid">
          {entries.map((entry) => (
            <div className="journal-tile" key={entry.image}>
              <img
                className="journal-tile__img"
                src={entry.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
              {entry.caption && (
                <span className="journal-tile__caption">
                  {entry.caption}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
