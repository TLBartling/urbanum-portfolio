import { useState } from "react";
import Header from "./Header";
import { getAboutPage, getArchiveItems } from "./content";
import { getOptimizedImageSrc, getOptimizedImageSrcSet } from "./imageOptimization.js";
import RichText from "./RichText";

// About Page redesign (About Page CMS milestone): replaces the previous
// six-image collage + Philosophy/Practice/Process + Contact footer with
// one restrained two-column composition -- an editable title/subtitle/
// body on the left, one dominant architectural image on the right.
//
// The left column's three fields (title, subtitle/location, body) all
// come from the About Page singleton document in Sanity
// (src/content/aboutPage.js), never from hardcoded JSX -- the site owner
// edits every word of this page from Sanity, without touching source.
// Each field is presence-guarded (renders only if populated, exactly the
// "an unpopulated field disappears cleanly rather than rendering blank
// space" convention already established in ProjectInfoPanel.jsx) --
// there is deliberately no hardcoded fallback title or copy anywhere in
// this file.
//
// The right-side image reuses the existing Archive Item `displayRole:
// 'Featured'` concept rather than a separate, unrelated image field --
// see selectFeaturedImage() below for the full selection behavior.
//
// The old collage (StudioImage/.studio-grid), its six PLACEHOLDER_IMAGES,
// and the Philosophy/Practice/Process + Contact footer (FOOTER_COLUMNS/
// CONTACT_FIELDS) are removed outright, per explicit instruction -- none
// of it is reused or redundant elsewhere, it's simply gone. The header
// and the page shell (.about-page/.about-content, shared with the
// Project Page and unrelated to this page's own content) are both
// untouched.
//
// Vertical composition pass (spatial-field redesign): the two-column
// side-by-side reading above is now historical -- .about-layout stacks
// vertically instead of running as a row (see styles.css's own comment
// on .about-layout for the full reasoning). Composition, top to bottom:
// one large defined image field first (.about-layout__image), then the
// text box (.about-layout__copy) -- title/subtitle (.about-layout__intro)
// grouped inside it as its opening, followed by the CMS body paragraphs,
// all centered as one block below the image. Nothing about where these
// three pieces of data come from changed -- only their arrangement in
// the DOM/JSX and the CSS that positions them. .about-page/.about-content/
// .about-hero__title/.about-hero__location remain the same shared base
// classes other pages (Projects/Journal/Project Template) also use;
// only the About-exclusive modifier/layout classes below them changed.
//
// Second composition pass (Josh review): title/subtitle moved from
// standing alone above the image to being grouped inside the text box
// (.about-layout__copy) below it, as that block's own opening -- see
// styles.css's own comments on .about-layout__copy/.about-layout__intro
// for the reasoning. The image is now the first child of .about-layout.
//
// Practice mockup pass (Josh review, desktop): per the supplied Practice
// mockup, the image field above is retired from this page's visible
// composition entirely -- the page is now a single centered editorial
// text column, title/intro/Philosophy heading/body and nothing else.
// This is a rendering-only change: selectFeaturedImage(), the
// featuredImage state, and the getOptimizedImageSrc/getOptimizedImageSrcSet
// imports are all left completely in place below, unused by the JSX --
// no Archive Item data, no image asset, and no CMS field was touched or
// deleted anywhere in this pass. The former <div className=
// "about-layout__image"> block is commented out immediately below the
// component, in place, specifically so restoring the image later (should
// a future mockup want it back) is a one-line uncomment, not a rebuild
// of markup nobody kept. .about-layout now renders exactly one child,
// .about-layout__copy -- see that rule's own comment in styles.css for
// how its centering/measure/top-offset were recalibrated now that
// nothing sits above it. Philosophy is not a second hardcoded heading:
// it is the CMS body's own "Section Heading" rich-text block (already
// one of the constrained formatting controls RichText.jsx supports),
// styled to match the Practice title via the new headingClassName prop
// below -- see aboutPageType.js/RichText.jsx, nothing new was added to
// the rich-text formatting system for this.

// Featured-image selection (IMAGE REQUIREMENT): reuses the exact Archive
// Item field Project Pages already use for their own opening image
// (archiveItemType.js's `displayRole`; see projectContent.js's
// resolveInitialImageId for the precedent) -- but globally, across every
// Archive Item regardless of which Project it belongs to, since the
// About page isn't scoped to one Project. No new Sanity query: this
// filters the exact same already-cached array getArchiveItems() already
// exposes to every other component, so it stays entirely inside the
// existing content-layer seam.
//
//   0 Featured items -- falls back to the first Archive Item that has an
//     image at all (same real content pool, just without the Featured
//     filter), so the page never shows a missing/broken image. If there
//     are no Archive Items at all yet, returns null and the image column
//     simply doesn't render (see the presence guard below) instead of a
//     broken <img>.
//   1 Featured item -- that's the only candidate, always selected.
//   2+ Featured items -- one is picked at random. This only ever runs
//     inside useState's lazy initializer below, which fires once on this
//     component's initial mount -- so a visitor sitting on the page
//     never sees it change (no interval, no re-roll on re-render), while
//     a fresh page load/refresh may land on a different one, exactly as
//     specified.
function selectFeaturedImage() {
  const items = getArchiveItems();
  const featured = items.filter(
    (item) => item.displayRole === "Featured" && item.image,
  );

  if (featured.length > 0) {
    return featured[Math.floor(Math.random() * featured.length)];
  }

  const anyWithImage = items.find((item) => item.image);
  return anyWithImage ?? null;
}

export default function AboutPage() {
  // Same drawer-height/opacity wiring App.jsx/ProjectsPage.jsx/the
  // Project Page all already use for their own scroll-container, reused
  // as-is so the header's Filter/Search/Menu drawer pushes and dims this
  // page's content the same way it does everywhere else.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  const aboutPage = getAboutPage();
  // Lazy initializer -- runs exactly once, on mount, per the selection
  // behavior documented above.
  const [featuredImage] = useState(selectFeaturedImage);

  // CMS typography foundation pass: prefer the new `bodyRichText` field
  // when Josh has actually put content in it; fall back to the legacy
  // blank-line-per-paragraph plain-text split (unchanged from before this
  // pass) when it's empty -- see aboutPageType.js's own comment on the
  // additive, non-destructive field pair this reflects. An About Page
  // document that predates this pass, or one nobody has re-edited since,
  // has no `bodyRichText` value at all and renders exactly as it always
  // has.
  const hasRichBody =
    Array.isArray(aboutPage?.bodyRichText) && aboutPage.bodyRichText.length > 0;

  // One blank line between paragraphs in Sanity's plain-text field becomes
  // one <p> here -- the same lightweight convention the schema's own
  // field description asks the editor to follow (see aboutPageType.js).
  const paragraphs =
    !hasRichBody && aboutPage?.body
      ? aboutPage.body
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
      : [];

  // Launch fidelity pass: renders CMS `title` as the text block's own
  // first heading (Josh's mockup shows "Practice" this way, not the old
  // title/subtitle hero) -- guarded against duplicating a future
  // rich-text "Practice" Section Heading. `subtitle` ("Miami, FL") is
  // intentionally never read; the Sanity fields stay untouched.
  const firstRichHeadingText = hasRichBody
    ? (aboutPage.bodyRichText.find((b) => b?.style === "h2")?.children ?? [])
        .map((s) => s?.text ?? "")
        .join("")
        .trim()
    : "";
  const showPracticeTitle =
    Boolean(aboutPage?.title) &&
    firstRichHeadingText.toLowerCase() !== aboutPage.title.trim().toLowerCase();

  // Practice micro-refinement: the mockup shows the FIRST inline
  // "Urbanum" (opening sentence) emphasized against the rest of the
  // intro copy. Splits that one span around the word and adds the same
  // "medium" mark RichText.jsx/richTextType.js already render (GT
  // America 500, via the existing .rich-text__medium rule) -- no
  // RichText.jsx change, no CMS edit, every other word untouched.
  function emphasizeFirstWord(blocks, word) {
    let done = false;
    return blocks.map((block) => {
      if (done || block?.style !== "normal" || !Array.isArray(block.children)) {
        return block;
      }
      const children = [];
      for (const span of block.children) {
        const idx = done ? -1 : (span?.text ?? "").indexOf(word);
        if (idx === -1) {
          children.push(span);
          continue;
        }
        const before = span.text.slice(0, idx);
        const after = span.text.slice(idx + word.length);
        if (before) children.push({ ...span, _key: `${span._key}-a`, text: before });
        children.push({
          ...span,
          _key: `${span._key}-b`,
          text: word,
          marks: [...(span.marks ?? []), "medium"],
        });
        if (after) children.push({ ...span, _key: `${span._key}-c`, text: after });
        done = true;
      }
      return { ...block, children };
    });
  }

  const emphasizedBody = hasRichBody
    ? emphasizeFirstWord(aboutPage.bodyRichText, "Urbānum")
    : [];

  // Final Practice desktop refinement: "Philosophy" is still a bold-
  // marked Normal paragraph in the CMS, not a real Section Heading, so
  // rendering it through RichText as-is leaves it visually dependent on
  // browser <strong> resolution instead of sharing Practice's own actual
  // heading element/class. This finds that one block by its exact text
  // and splits the stream around it -- every other block (the intro
  // paragraph, all seven Philosophy statements) still passes through
  // RichText completely unchanged, just as two calls instead of one.
  const philosophySplit = (() => {
    if (!hasRichBody) return null;
    const index = emphasizedBody.findIndex((block) => {
      if (block?.style !== "normal") return false;
      const text = (block.children ?? [])
        .map((span) => span?.text ?? "")
        .join("")
        .trim();
      return text.toLowerCase() === "philosophy";
    });
    return index === -1
      ? null
      : {
          before: emphasizedBody.slice(0, index),
          after: emphasizedBody.slice(index + 1),
        };
  })();

  return (
    <div className="about-page">
      <Header
        onFilterOpenChange={setIsIndexDrawerOpen}
        onDrawerHeightChange={setIndexDrawerHeight}
      />

      <div
        className={`about-content about-content--redesign${
          isIndexDrawerOpen ? " scroll-container--drawer-open" : ""
        }`}
        style={{
          // margin-top, not transform: on a child page the drawer stays
          // open for the whole visit (see Header.jsx), so this offset is
          // steady-state, not a brief animated toggle -- same reasoning
          // as every other child page's own scroll-container wiring.
          marginTop: indexDrawerHeight
            ? `${Math.round(indexDrawerHeight) + 8}px`
            : undefined,
        }}
      >
        <div className="about-layout">
          {/* Practice mockup pass (Josh review): the large Featured image
              is intentionally not rendered in this composition any more --
              see the file-header comment above for the full reasoning.
              Left in place, commented out rather than deleted, so a future
              pass can restore it verbatim:

          {featuredImage && (
            <div className="about-layout__image">
              <picture>
                <source
                  type="image/webp"
                  srcSet={getOptimizedImageSrcSet(featuredImage.image, "webp")}
                  sizes="100vw"
                />
                <source
                  type="image/jpeg"
                  srcSet={getOptimizedImageSrcSet(featuredImage.image, "jpg")}
                  sizes="100vw"
                />
                <img
                  className="about-layout__img"
                  src={getOptimizedImageSrc(featuredImage.image, 1200)}
                  alt={
                    featuredImage.title ||
                    featuredImage.caption ||
                    `Archive ${featuredImage.archiveNumber}`
                  }
                  loading="eager"
                  decoding="async"
                />
              </picture>
            </div>
          )}
          */}

          {(hasRichBody ||
            aboutPage?.title ||
            aboutPage?.subtitle ||
            paragraphs.length > 0) && (
            <div className="about-layout__copy">
              {/* Launch fidelity pass: superseded the old
                  `!hasRichBody`-only gate above `showPracticeTitle`'s own
                  definition, once launch required "Practice" to render
                  even while bodyRichText has no real Section Heading of
                  its own for it yet -- see that const's comment. */}
              {showPracticeTitle && (
                <p className="about-layout__heading">{aboutPage.title}</p>
              )}

              {hasRichBody ? (
                philosophySplit ? (
                  <>
                    <RichText
                      value={philosophySplit.before}
                      paragraphClassName="about-layout__paragraph"
                      headingClassName="about-layout__heading"
                    />
                    <p className="about-layout__heading">Philosophy</p>
                    <RichText
                      value={philosophySplit.after}
                      paragraphClassName="about-layout__paragraph"
                      headingClassName="about-layout__heading"
                    />
                  </>
                ) : (
                  <RichText
                    value={emphasizedBody}
                    paragraphClassName="about-layout__paragraph"
                    headingClassName="about-layout__heading"
                  />
                )
              ) : (
                paragraphs.map((paragraph, index) => (
                  <p className="about-layout__paragraph" key={index}>
                    {paragraph}
                  </p>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
