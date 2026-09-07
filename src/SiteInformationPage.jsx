import { useState } from "react";
import Header from "./Header";
import { navigate } from "./navigation";
import { getSiteInformationPage } from "./content";
import RichText from "./RichText";

// Utility Information Phase: the canonical, crawlable /site-information
// page. Its two jobs are (1) real, sparse Accessibility and Copyright
// copy, and (2) a legitimate, real <a href> path in to
// /practice/questions -- that page has never had a direct link from
// anywhere in the primary site (see PracticeQuestionsPage.jsx's own
// header comment), so this is its first one. Reuses the exact shared
// shell/typography classes AboutPage.jsx and PracticeQuestionsPage.jsx
// already use (.about-page/.about-content/.about-layout/
// .about-layout__copy/.about-layout__heading/.about-layout__paragraph)
// rather than inventing a new utility-page template, per instruction to
// follow the site's own established visual/behavioral logic. Identical
// Header/drawer wiring to those same pages, reused verbatim.
//
// This page is intentionally NOT in desktop primary navigation, the
// mobile menu, or the Practice page's own content -- its only inbound
// path is the one new site-wide bottom-right utility link (see
// Router.jsx's own comment on where that link is mounted, and why).
export default function SiteInformationPage() {
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [indexDrawerHeight, setIndexDrawerHeight] = useState(0);

  // Surgical CMS pass: each field falls back to the exact original
  // hardcoded copy (below, inline) whenever the Sanity siteInformationPage
  // document is missing or a given field is empty, so a not-yet-published
  // document degrades to today's page rather than showing blank copy.
  const cms = getSiteInformationPage();
  const accessibilityText =
    cms?.accessibilityText ||
    "Urb\u0101num is committed to providing a website that is accessible to the widest possible audience. If you experience difficulty accessing any part of this site, please contact the office so the issue can be reviewed.";
  const copyrightText =
    cms?.copyrightText ||
    "Unless otherwise indicated, the text, images, drawings, and other material presented on this website are the property of Urb\u0101num or their respective copyright holders. Materials may not be reproduced, distributed, or used without permission from the applicable rights holder.";

  // Surgical correction: Fine Print is now one Portable Text field
  // (finePrintRichText), rendered through the same shared RichText
  // component/link renderer every other rich-text field on this site
  // already uses -- same "meaningful content" presence check
  // ContactPage.jsx's own hasRichBody already established, reused here
  // rather than re-derived differently. Falls back to the exact original
  // hardcoded paragraph (including its own client-side navigate()
  // handler) only when the CMS document doesn't exist yet or the field is
  // empty.
  const hasFinePrintRichText = (cms?.finePrintRichText ?? []).some(
    (block) =>
      Array.isArray(block?.children) &&
      block.children.some(
        (child) =>
          typeof child?.text === "string" && child.text.trim() !== "",
      ),
  );

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
          marginTop: indexDrawerHeight
            ? `${Math.round(indexDrawerHeight) + 8}px`
            : undefined,
        }}
      >
        <div className="about-layout">
          <main className="about-layout__copy">
            <h1 className="visually-hidden">Site Information</h1>

            <h2 className="about-layout__heading">Accessibility</h2>
            <p className="about-layout__paragraph">{accessibilityText}</p>

            <h2 className="about-layout__heading">Copyright</h2>
            <p className="about-layout__paragraph">{copyrightText}</p>

            {hasFinePrintRichText ? (
              <RichText
                value={cms.finePrintRichText}
                paragraphClassName="site-information__fine-print"
              />
            ) : (
              <p className="site-information__fine-print">
                For additional information about Urbānum’s services,
                areas of practice, and approach to architecture, visit
                {" "}
                <a
                  href="/practice/questions"
                  onClick={(event) => {
                    if (
                      event.defaultPrevented ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    navigate("/practice/questions");
                  }}
                >
                  About the Practice
                </a>
                .
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
