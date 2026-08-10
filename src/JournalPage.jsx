import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import { getJournalEntries } from "./content";

// The Journal is a plain, growing image archive -- meant to read as a
// quiet visual notebook rather than a portfolio or gallery. Image-only
// field (Josh review): the per-entry hover caption this grid used to
// show has been removed entirely, per the client's explicit request --
// see JournalTile below, which no longer reads or renders `entry.caption`
// at all. The underlying data is untouched: `entries`/`getJournalEntries`
// still carry `caption` exactly as before (see src/cms/queries.js's
// normalizeJournalEntry) -- this is a presentation-only removal, not a
// data or CMS change, so a future surface could still read it.
//
// Controlled frame vocabulary (Josh review, same pass): the old single
// fixed near-square crop (aspect-ratio: 5/4 on .journal-tile) forced
// every image into the same shape regardless of its own orientation,
// cropping landscape and portrait photographs heavily. JournalTile below
// now detects each image's real orientation client-side (its `<img>`'s
// own naturalWidth/naturalHeight, once loaded) and assigns it one of
// exactly two fixed frames -- .journal-tile--landscape /
// .journal-tile--portrait, see styles.css -- never a freeform/organic
// height. This is deliberately NOT a CMS/query change: Sanity's image
// asset metadata does carry real dimensions, but querying it would mean
// touching src/cms/queries.js, which this pass avoids -- reading the
// already-fetched image's own loaded bitmap client-side gets the same
// real orientation with a strictly smaller, presentation-only diff.
//
// The `entries` prop is the CMS seam, following the same prop-default
// pattern already used by AboutPage/the earlier Journal CMS handshake.
// `<JournalPage />` (see Router.jsx) is this component's only caller and
// never passes this prop, so the default is always what actually renders
// today.
//
// One tile, one orientation-detection lifecycle. A separate component
// (rather than inlining this in the map below) because each tile needs
// its own independent `orientation` state -- one entry's image loading
// must never affect any other tile's frame. `imgRef` + the mount-time
// effect below cover the case where the image is already served from
// the browser cache before this component's onLoad handler attaches (a
// real React/DOM race: a cached image can fire its native `load` event
// before a listener is wired up), so orientation is still detected
// correctly even then, not just on a fresh network load.
function JournalTile({ entry }) {
  const [orientation, setOrientation] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth) {
      setOrientation(
        img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait",
      );
    }
  }, []);

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setOrientation(naturalWidth >= naturalHeight ? "landscape" : "portrait");
  };

  return (
    <div
      className={`journal-tile${
        orientation ? ` journal-tile--${orientation}` : ""
      }`}
    >
      <img
        ref={imgRef}
        className="journal-tile__img"
        src={entry.image}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={handleImageLoad}
      />
    </div>
  );
}

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
            <JournalTile entry={entry} key={entry.image} />
          ))}
        </div>
      </div>
    </div>
  );
}
