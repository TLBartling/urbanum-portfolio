import { useState } from "react";
import Header from "./Header";
import { allImages } from "./App";

// The Journal is a plain, growing image archive -- three equal columns,
// one fixed aspect ratio, no captions, numbers, or click behavior. It's
// meant to read as a quiet visual notebook rather than a portfolio or
// gallery, so the implementation is deliberately restrained: a CSS grid
// and nothing else layered on top.
//
// The `images` prop is the CMS seam, following the same prop-default
// pattern already used by AboutPage: today it defaults to the same
// placeholder pool the gallery draws from, but is meant to be swapped
// later for whatever set of entries the CMS resolves for
// Category/Theme = "Journal" -- nothing about this page's structure
// needs to change when that happens.
export default function JournalPage({ images = allImages }) {
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
          transform: indexDrawerHeight
            ? `translateY(${Math.round(indexDrawerHeight) + 8}px)`
            : undefined,
        }}
      >
        <div className="journal-grid">
          {images.map((src) => (
            <div className="journal-tile" key={src}>
              <img
                className="journal-tile__img"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
