import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import { getJournalEntries } from "./content";

// The Journal is a plain, growing image archive -- meant to read as a
// quiet visual notebook rather than a portfolio or gallery. Image-only
// field (Josh review): the per-entry hover caption this grid used to
// show has been removed entirely, per the client's explicit request --
// nothing below reads or renders `entry.caption` at all. The underlying
// data is untouched: `entries`/`getJournalEntries` still carry `caption`
// exactly as before (see src/cms/queries.js's normalizeJournalEntry) --
// this was a presentation-only removal, not a data or CMS change.
//
// Justified gallery, fourth layout pass (Josh review, MAKR reference):
// the previous justified-gallery pass (buildJustifiedRows greedily
// filling each row until a target height was reached) fixed the earlier
// gap failures, but it let row IMAGE COUNT float freely -- at this
// project's own photography and a sensible target height, that meant 5+
// images per row on a normal desktop width, reading as a dense contact
// sheet rather than the MAKR reference's clean 3-per-row rhythm.
//
// This pass keeps the same underlying idea (a row's height is solved
// from its images' combined aspect ratios so their widths sum exactly to
// the container's width -- still no CSS-only mechanism can do that) but
// changes what's held fixed: COLUMN COUNT is now fixed per breakpoint
// (getColumnCount below -- 3 on a normal/wide container, matching MAKR),
// and row HEIGHT is what varies row to row, solved from whichever 3
// images land in that row. That inversion is exactly "grid first,
// masonry second" in its purest form: the grid (3 equal slots per row)
// is the fixed structure; the "masonry" is only ever a small amount of
// row-to-row height variation, never a change in how many images sit in
// a row. Source order is preserved exactly -- entries are simply
// chunked into consecutive groups of `columns` (see buildJustifiedRows),
// nothing is reordered or hand-picked to "fit" better.
//
// Why this still needs the container's actual measured pixel width (via
// ResizeObserver, see the effect below) rather than being pure CSS: even
// with column count fixed, "what height makes these 3 images' widths sum
// to exactly this many pixels" is still real arithmetic over real pixel
// widths, not something CSS alone can solve. Responsiveness is still the
// same mechanism, not a separate one -- getColumnCount drops to 2, then
// 1, as the observed width narrows, and getGutter scales the same way it
// always has.
//
// Why this still needs each image's real aspect ratio up front, not
// detected client-side after each image loads: chunking into rows of
// `columns` doesn't depend on ratios, but the row-height solve still
// does, and it still has to be stable from first paint for the same
// reason as before -- an image's real ratio only becoming known after
// its own load would mean that row's height (and therefore every other
// image in it) visibly resizing later. `entry.aspectRatio` comes from
// Sanity's own asset metadata (see src/cms/queries.js's
// normalizeJournalEntry); no Sanity query change was needed this pass
// either. An entry with no aspectRatio (`null`) falls back to
// DEFAULT_ASPECT_RATIO below, this project's own dominant real landscape
// ratio (public/img/*.jpg).
//
// The `entries` prop is the CMS seam, following the same prop-default
// pattern already used by AboutPage/the earlier Journal CMS handshake.
// `<JournalPage />` (see Router.jsx) is this component's only caller and
// never passes this prop, so the default is always what actually renders
// today.
const DEFAULT_ASPECT_RATIO = 3 / 2;

// Fixed column count per breakpoint -- the MAKR reference's own "3 per
// row" structure, stepping down as the container narrows so a row never
// has to squeeze 3 images into a container too narrow to hold them
// without excessive cropping. 700px/420px mirror this stylesheet's
// existing narrow/mobile breakpoint conventions elsewhere (e.g. the
// Journal grid's own earlier 700px breakpoint, before this pass).
function getColumnCount(containerWidth) {
  if (containerWidth >= 700) return 3;
  if (containerWidth >= 420) return 2;
  return 1;
}

// Inter-image gutter, solved from the container's own measured width
// rather than viewport width -- mirrors the same
// clamp(14px, 1.6vw, 24px) gutter already used throughout this
// stylesheet, evaluated here in JS against the gallery's own container
// width since the row-packing math needs a concrete pixel value.
function getGutter(containerWidth) {
  return Math.max(14, Math.min(24, containerWidth * 0.016));
}

function resolveRatio(entry) {
  return typeof entry.aspectRatio === "number" && entry.aspectRatio > 0
    ? entry.aspectRatio
    : DEFAULT_ASPECT_RATIO;
}

// Turns one row's worth of entries (exactly `columns` of them, except
// possibly the very last row -- see buildJustifiedRows) into concrete
// pixel dimensions. `height` is solved so that this row's own images,
// scaled to it, sum to exactly `containerWidth` -- there is no leftover
// width to be a gap in any row built this way. `fallbackHeight` is only
// used for a trailing row that has fewer than `columns` images (nothing
// left in the source sequence to fill it); it renders at that height
// without being stretched to fill the remaining width, the same
// standard justified-gallery convention (Flickr, Google Photos, etc.)
// the previous pass already used -- the only place a gallery-width gap
// is expected, since it only appears once, at the very end of the whole
// sequence, never as a hole in the middle of the grid.
function finalizeRow(row, columns, containerWidth, gutter, fallbackHeight) {
  const isFull = row.length === columns;
  const ratioSum = row.reduce((sum, entry) => sum + resolveRatio(entry), 0);

  const height = isFull
    ? (containerWidth - (row.length - 1) * gutter) / ratioSum
    : fallbackHeight;

  return {
    height,
    gutter,
    items: row.map((entry) => ({
      entry,
      width: height * resolveRatio(entry),
    })),
  };
}

// The row-packing algorithm itself. Walks `entries` in their original
// order exactly once and chunks them into consecutive groups of
// `columns` (never reordering, never picking which images go together --
// row N is always entries[N*columns .. N*columns+columns-1]). Each full
// group's height is solved from its own images (see finalizeRow); a
// trailing group with fewer than `columns` images (only possible once,
// at the very end) reuses the previous full row's own solved height, so
// it reads as part of the same rhythm rather than an arbitrary size --
// or, if there was no previous full row at all (very few entries total),
// falls back to a height computed from the row's own images and a
// nominal one-column-of-`columns` width, giving a sensible number even
// with nothing else on the page to match.
function buildJustifiedRows(entries, containerWidth) {
  if (!containerWidth) return [];

  const columns = getColumnCount(containerWidth);
  const gutter = getGutter(containerWidth);

  const rows = [];
  let lastFullRowHeight = null;

  for (let i = 0; i < entries.length; i += columns) {
    const rowEntries = entries.slice(i, i + columns);
    const isFull = rowEntries.length === columns;

    const fallbackHeight =
      lastFullRowHeight ??
      (containerWidth - (columns - 1) * gutter) /
        columns /
        DEFAULT_ASPECT_RATIO;

    const row = finalizeRow(
      rowEntries,
      columns,
      containerWidth,
      gutter,
      fallbackHeight,
    );

    if (isFull) lastFullRowHeight = row.height;
    rows.push(row);
  }

  return rows;
}

export default function JournalPage({ entries = getJournalEntries() }) {
  // Same drawer-height/opacity wiring App.jsx, AboutPage.jsx, and
  // ProjectsPage.jsx already use for their own scroll-container, reused
  // as-is so the header's Filter/Search/Menu drawer pushes and dims this
  // page's content the same way it does everywhere else.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  // The gallery's own measured width -- ResizeObserver rather than a
  // window-resize listener specifically because the Filter/Menu drawer
  // (above) changes this container's width via its own margin-top/layout
  // push without necessarily firing a window resize event, and because
  // observing the container directly is correct regardless of what
  // caused it to change width. Starts at 0 (nothing measured yet);
  // buildJustifiedRows returns no rows for a width of 0, so the gallery
  // simply renders nothing for the one frame before the observer's first
  // callback fires, rather than flashing a garbled zero-width layout.
  const galleryRef = useRef(null);
  const [galleryWidth, setGalleryWidth] = useState(0);

  useEffect(() => {
    const node = galleryRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setGalleryWidth(entry.contentRect.width);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const rows = useMemo(
    () => buildJustifiedRows(entries, galleryWidth),
    [entries, galleryWidth],
  );

  // Geometry fix, then final responsive refinement (three passes): the
  // grid is not a fixed 3-column layout -- each row's real tile widths
  // are solved from that row's own images' aspect ratios (see
  // buildJustifiedRows/finalizeRow above) -- so a CSS-only nominal
  // fraction approximation can drift from the grid's actual rendered
  // width at any tier. Reusing the first row's own already-computed item
  // widths and gutter (no row-layout math duplicated here) and handing
  // the result to .journal-intro as a CSS custom property keeps the
  // intro's width exact by construction rather than approximate.
  //
  // Surgical fix: the earlier first-tile-width heuristic (a minimum
  // readable-width threshold on the solved tile itself) mis-fired twice
  // -- it isn't a reliable proxy for "normal desktop vs. intermediate,"
  // since a given tile width can arise at more than one real browser
  // size depending on image aspect ratios in that row. Replaced with a
  // simple, explicit viewport-state breakpoint on galleryWidth -- the
  // gallery's own already-measured container width (the same
  // ResizeObserver-driven state buildJustifiedRows itself consumes) --
  // so the tier is driven by the actual browser/container size, not a
  // tile-size guess:
  //   - galleryWidth >= 1100   (normal desktop, Josh's mockup default)
  //     -> first tile's own width alone.
  //   - 640 < galleryWidth < 1100   (intermediate/tablet-like)
  //     -> first tile + that row's own real gutter + second tile, so
  //        the intro's right edge lines up with the second image's own
  //        right edge exactly as its left edge lines up with the first.
  //   - galleryWidth <= 640   (existing mobile state -- same threshold
  //     already used for the header-clearance margin reset below, so
  //     the intro's width and vertical-clearance behavior change at the
  //     same real breakpoint) -> "100%".
  // Tile widths and the gutter are still read directly from the
  // already-computed rows array, never duplicated here. undefined before
  // the gallery's first ResizeObserver callback fires (rows is still []
  // then) -- styles.css's own var() fallback (the original nominal
  // calc()) covers that one frame and the "no entries at all" case.
  const firstTileWidth = rows[0]?.items[0]?.width;
  const secondTileWidth = rows[0]?.items[1]?.width;
  const introWidth =
    firstTileWidth === undefined
      ? undefined
      : galleryWidth >= 1100
        ? `${firstTileWidth}px`
        : galleryWidth > 640
          ? secondTileWidth !== undefined
            ? `${firstTileWidth + rows[0].gutter + secondTileWidth}px`
            : `${firstTileWidth}px`
          : "100%";

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
        {/* Journal intro (launch fidelity): Josh's approved copy, hard-
            coded here rather than added as a new CMS field -- there is
            only ever this one fixed block of text, not editable per-entry
            content the way the grid below is. "Journal Of Curiosities" is
            the one bold emphasis Josh's own mockup shows inline; nothing
            else in the paragraph is bold. See introWidth's own comment
            above for why its value is set here as an inline custom
            property rather than in styles.css alone. */}
        <p
          className="journal-intro"
          style={
            introWidth
              ? { "--journal-intro-width": introWidth }
              : undefined
          }
        >
          Driven by an ongoing interest in how architecture is perceived
          and presented, the <strong>Journal Of Curiosities</strong> is a
          place to document Urbānum's way of thinking about architecture
          and the city through our work, ideas, and references. It serves
          as an evolving space for research, reflection, and exchange,
          allowing connections to emerge across projects, disciplines,
          and ideas.
        </p>

        <div className="journal-grid" ref={galleryRef}>
          {rows.map((row, rowIndex) => (
            <div
              className="journal-row"
              key={row.items[0].entry.image}
              style={{
                height: `${row.height}px`,
                gap: `${row.gutter}px`,
                marginTop: rowIndex === 0 ? 0 : `${row.gutter}px`,
              }}
            >
              {row.items.map(({ entry, width }) => (
                <div
                  className="journal-tile"
                  key={entry.image}
                  style={{ width: `${width}px` }}
                >
                  <img
                    className="journal-tile__img"
                    src={entry.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
