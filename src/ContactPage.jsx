import { useState } from "react";
import Header from "./Header";
import { getContactPage } from "./content";
import RichText from "./RichText";
import { getOptimizedImageSrc, getOptimizedImageSrcSet } from "./imageOptimization.js";

// Contact Page (Contact drawer -> Contact page milestone): replaces the
// old Header Contact drawer -- a hardcoded ["Instagram", "Email",
// "Phone"] list opened as a panel (see Header.jsx's own comment on
// MENU_LINKS for where that logic was removed) -- with a real, routable
// page at "/contact", built the same way AboutPage.jsx is built.
//
// Content (title, subtitle, body) all comes from the Contact Page
// singleton document in Sanity (src/content/contactPage.js), never from
// hardcoded JSX -- the site owner edits every word of this page from
// Sanity, exactly like About. Each field is presence-guarded (renders
// only if populated, the same convention AboutPage.jsx/ProjectInfoPanel.jsx
// already use) -- there is deliberately no hardcoded fallback copy
// anywhere in this file.
//
// Layout is deliberately simpler than About's: this page has no image
// field and no large spatial composition -- per the brief, it's meant to
// read as quiet, left-aligned, typographically-driven text, closer to
// the reference screenshot (a name/address block, then a few short
// paragraphs) than to a designed "page." It reuses .about-page/
// .about-content for the page shell (background, header clearance, side
// padding -- the same shell Projects/Journal/Project Template already
// share) rather than introducing a new one, and adds one small,
// Contact-exclusive class (.contact-layout/.contact-layout__paragraph)
// for the plain left-aligned paragraph stack -- see styles.css for that
// rule's own comment.
//
// Image-integration pass (Josh review, desktop): per the supplied Contact
// mockup, Josh's own photograph now sits beside this same text column as
// a second, right-hand column -- see .contact-page-layout's comment in
// styles.css for the full layout reasoning. This is an added wrapper
// only: .contact-layout above (title/subtitle/body, all still driven
// entirely by the Contact Page Sanity document exactly as the comment
// above describes) is completely untouched, just nested one level
// deeper as the new row's left child instead of about-content's direct
// child. The image itself is a plain local production asset --
// public/img/urbanum-office-exterior.jpg, Josh's own supplied source
// photograph copied in at full quality -- not a Sanity/CMS field.
// Contact's schema (contactPageType.js) has no image field, and per
// explicit instruction this pass does not add one; the existing
// public/img/ + scripts/optimize-images.mjs convention (the same one
// every other local photo on this site already goes through, see
// imageOptimization.js) is reused as-is, via the same
// getOptimizedImageSrc/getOptimizedImageSrcSet helpers AboutPage.jsx's
// own (now-retired) image block used. Rendered at its full natural
// aspect ratio, no crop -- confirmed against the mockup by direct pixel
// measurement (the mockup's own image bounds measure to the same ~1.57
// aspect ratio as the source JPEG's real 2248x1428 dimensions, within
// rounding) -- so no object-fit/object-position cropping is applied
// anywhere below.
const CONTACT_IMAGE_SRC = "/img/urbanum-office-exterior.jpg";
export default function ContactPage() {
  // Same drawer-height/opacity wiring every other child page (About,
  // Projects, Journal, Project) already uses for its own scroll-
  // container, reused as-is so the header's Filter/Search/Menu drawer
  // pushes and dims this page's content the same way it does everywhere
  // else.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  const contactPage = getContactPage();

  // CMS typography foundation pass: same "prefer the new rich field,
  // fall back to the legacy plain-text split when empty" pattern as
  // AboutPage.jsx's own `hasRichBody`/`paragraphs` -- see that file's
  // comment for the full reasoning.
  const hasRichBody =
    Array.isArray(contactPage?.bodyRichText) &&
    contactPage.bodyRichText.length > 0;

  // Same blank-line-per-paragraph convention as AboutPage.jsx's own
  // `paragraphs` derivation -- see aboutPageType.js/contactPageType.js's
  // shared field description for what this asks the editor to do.
  const paragraphs =
    !hasRichBody && contactPage?.body
      ? contactPage.body
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
      : [];

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
          // steady-state, not a brief animated toggle -- same reasoning
          // as every other child page's own scroll-container wiring.
          marginTop: indexDrawerHeight
            ? `${Math.round(indexDrawerHeight) + 8}px`
            : undefined,
        }}
      >
        <div className="contact-page-layout">
          <div className="contact-layout">
            {/* Authoring-architecture pass: when bodyRichText has content,
                it owns the ENTIRE visible left-column composition --
                including whatever stands in for "Urbānum" and "Office For
                Architecture" themselves -- so the legacy Title/Subtitle
                below are gated behind `!hasRichBody` and never render
                alongside it. Without this gate, a document authored with
                the new rich field would show "Urbānum" twice: once here
                as the plain title, once again as the rich text's own
                opening Section Heading. See contactPageType.js's own
                comment on why Title/Subtitle are no longer required now
                that this is possible. */}
            {!hasRichBody && contactPage?.title && (
              <h1 className="about-hero__title">{contactPage.title}</h1>
            )}

            {!hasRichBody && contactPage?.subtitle && (
              <p className="about-hero__location">{contactPage.subtitle}</p>
            )}

            {(hasRichBody || paragraphs.length > 0) && (
              <div className="contact-layout__copy">
                {hasRichBody ? (
                  <RichText
                    value={contactPage.bodyRichText}
                    paragraphClassName="contact-layout__paragraph"
                    // Contact-specific headingClassName -- without this,
                    // Section Heading would fall back to RichText.jsx's
                    // shared default (.rich-text__heading: 1.05em/500,
                    // sized for an in-body subheading like About's
                    // "Philosophy"), which reads far smaller/lighter than
                    // Contact's own former title. Giving Section Heading a
                    // page-scoped class here (styles.css's own
                    // .contact-layout__heading) is what makes it usable as
                    // the "Urbānum" title-equivalent this task calls for --
                    // no new formatting control, just page-appropriate
                    // sizing for the one heading control that already
                    // exists, the same pattern About already established
                    // for "Philosophy" via .about-layout__heading.
                    headingClassName="contact-layout__heading"
                  />
                ) : (
                  paragraphs.map((paragraph, index) => (
                    <p className="contact-layout__paragraph" key={index}>
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="contact-page-layout__image">
            <picture>
              <source
                type="image/webp"
                srcSet={getOptimizedImageSrcSet(CONTACT_IMAGE_SRC, "webp")}
                sizes="50vw"
              />
              <source
                type="image/jpeg"
                srcSet={getOptimizedImageSrcSet(CONTACT_IMAGE_SRC, "jpg")}
                sizes="50vw"
              />
              <img
                src={getOptimizedImageSrc(CONTACT_IMAGE_SRC, 1200)}
                alt="Urbanum office exterior"
                loading="eager"
                decoding="async"
              />
            </picture>
          </div>
        </div>
      </div>
    </div>
  );
}
