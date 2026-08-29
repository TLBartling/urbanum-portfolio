import { PortableText } from "@portabletext/react";

// CMS typography foundation pass: the one shared Portable Text renderer
// every upgraded field (About body, Contact body, Project description)
// goes through -- mirrors cms/schemaTypes/richTextType.js's own "one
// shared, reusable definition" principle on the frontend side. A calling
// page passes in its OWN existing className for the "Normal" paragraph
// style (e.g. "about-layout__paragraph") so a document that only ever
// uses Normal blocks renders with exactly the same markup/CSS it already
// had before this pass -- no new CSS, no visual change, for that case.
// Only genuinely new elements (Section Heading, the Medium mark, links)
// use new, additive classes (see styles.css's own "CMS typography
// foundation pass" rules for .rich-text__heading/.rich-text__medium/
// .rich-text__link).
//
// Bold ('strong') and Italic ('em') are left to @portabletext/react's own
// built-in defaults deliberately -- they already render plain <strong>/
// <em> tags, which is exactly right here: <strong> picks up the loaded
// GT America 700 file via ordinary browser font-weight:bolder resolution
// (see styles.css's @font-face blocks), no CSS needed. <em> has no true
// italic GT America face to resolve to (confirmed: no italic/oblique
// files exist in public/fonts/) -- it renders as the browser's own
// synthesized/slanted Regular, Medium, or Bold. That's disclosed here,
// not hidden: this is the smallest appropriate fallback per this pass's
// own instruction not to fabricate a complicated solution for a font file
// that doesn't exist.
//
// Medium has no built-in Portable Text decorator (Sanity's `marks.decorators`
// only ships Bold/Italic/Underline/Strike/Code out of the box) -- `medium`
// is registered as a custom decorator in richTextType.js, and rendered
// here as a plain <span>, i.e. this file's own custom `marks.medium`
// component below, giving it GT America 500 via one small additive CSS
// rule.
//
// Muted (Contact visual-fidelity pass) is the same kind of custom
// decorator as Medium -- see richTextType.js's own comment on exactly
// what it represents and why it was added -- rendered the same way, as a
// plain <span> (this file's own `marks.muted` below) carrying one fixed,
// additive CSS rule (.rich-text__muted).
//
// Links: the CMS's one annotation type (`link`, richTextLinkType.js) is a
// single required `href` URL field, scheme-restricted to http/https/
// mailto/tel. `target="_blank" rel="noopener noreferrer"` is applied only
// for http(s) links -- opening a mailto:/tel: link in a new tab/window is
// meaningless (it hands off to the OS mail/phone handler, not a page), so
// those render as plain same-window links, matching how a mailto/tel link
// behaves everywhere else on the web.
function isExternalHref(href) {
  return /^https?:/i.test(href ?? "");
}

// Contact visual-fidelity pass: the id (`_key`) of the FIRST Section
// Heading block in a rich-text array, or null if there isn't one.
// Deliberately a pure, standalone function over the plain `value` array
// RichText already receives -- not a mutable counter incremented from
// inside a block-renderer closure. An earlier version of this file tried
// exactly that (a `let headingIndex` closed over by the h2 renderer,
// incremented each time it ran) and it silently never matched: React 18
// renders in StrictMode invoke a component's render output more than
// once per commit to surface exactly this kind of impurity, and a
// mutable closure variable shared across those extra invocations does
// not track "which block is first" reliably. Computing the answer once,
// from the immutable `value` array itself, before any block component
// runs, has no such failure mode.
function firstHeadingKey(value) {
  const firstHeading = value.find((block) => block.style === "h2");
  return firstHeading?._key ?? null;
}

function makeComponents({
  paragraphClassName,
  headingClassName,
  linkClassName,
  firstHeadingKey,
} = {}) {
  return {
    block: {
      normal: ({ children }) => (
        <p className={paragraphClassName}>{children}</p>
      ),
      // Contact visual-fidelity pass: `value` here is the block object
      // itself (Portable Text passes each block's own data to its
      // renderer), so comparing its `_key` against the pre-computed
      // firstHeadingKey is what gives "Urbānum" (always the opening
      // Section Heading in the approved authoring order) its own
      // wordmark-echoing letter-spacing (see styles.css's
      // .rich-text__heading--first) without touching "Office For
      // Architecture" or any later heading. Purely structural -- this has
      // no idea what text any block contains, only where it falls in
      // document order -- so it works the same for any future rich-text
      // content, not just this specific copy. About's own
      // headingClassName usage (.about-layout__heading) never references
      // this modifier, so it's a harmless no-op there even though
      // "Philosophy" would also receive it if it's that document's first
      // Section Heading.
      h2: ({ children, value }) => {
        const base = headingClassName ?? "rich-text__heading";
        const className =
          value?._key === firstHeadingKey
            ? `${base} rich-text__heading--first`
            : base;
        return <p className={className}>{children}</p>;
      },
    },
    marks: {
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      medium: ({ children }) => (
        <span className="rich-text__medium">{children}</span>
      ),
      muted: ({ children }) => (
        <span className="rich-text__muted">{children}</span>
      ),
      link: ({ value, children }) => {
        const href = value?.href;
        if (!href) return <>{children}</>;

        return (
          <a
            className={linkClassName ?? "rich-text__link"}
            href={href}
            {...(isExternalHref(href)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {children}
          </a>
        );
      },
    },
  };
}

// `value` is the raw Portable Text block array as returned by
// src/cms/queries.js (passed through unmodified). Renders nothing --
// not even a wrapping element -- when there's no content, so a caller can
// use this as a drop-in presence-guarded replacement for a plain
// paragraph-mapping block (see AboutPage.jsx/ContactPage.jsx/
// ProjectInfoPanel.jsx for the exact "use this if populated, otherwise
// fall back to the legacy plain-text rendering" pattern this enables).
//
// Section Heading is rendered as a styled <p>, not a semantic <h2>/<h3> --
// deliberate: each page already has its own real page-level <h1> (the
// page title) outside this field entirely, and an in-body "Philosophy"-
// style heading reads as an emphasis point within one continuous piece of
// prose, not a new outline level in the page's own heading structure.
// Using a semantic heading tag here would insert an h2 with no matching
// page-level h1-then-h2 hierarchy intent behind it.
export default function RichText({
  value,
  paragraphClassName,
  headingClassName,
  linkClassName,
}) {
  if (!Array.isArray(value) || value.length === 0) return null;

  return (
    <PortableText
      value={value}
      components={makeComponents({
        paragraphClassName,
        headingClassName,
        linkClassName,
        firstHeadingKey: firstHeadingKey(value),
      })}
    />
  );
}
