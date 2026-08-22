import { useState } from "react";
import Header from "./Header";
import { getContactPage } from "./content";

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
export default function ContactPage() {
  // Same drawer-height/opacity wiring every other child page (About,
  // Projects, Journal, Project) already uses for its own scroll-
  // container, reused as-is so the header's Filter/Search/Menu drawer
  // pushes and dims this page's content the same way it does everywhere
  // else.
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  const contactPage = getContactPage();

  // Same blank-line-per-paragraph convention as AboutPage.jsx's own
  // `paragraphs` derivation -- see aboutPageType.js/contactPageType.js's
  // shared field description for what this asks the editor to do.
  const paragraphs = contactPage?.body
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
        <div className="contact-layout">
          {contactPage?.title && (
            <h1 className="about-hero__title">{contactPage.title}</h1>
          )}

          {contactPage?.subtitle && (
            <p className="about-hero__location">{contactPage.subtitle}</p>
          )}

          {paragraphs.length > 0 && (
            <div className="contact-layout__copy">
              {paragraphs.map((paragraph, index) => (
                <p className="contact-layout__paragraph" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
