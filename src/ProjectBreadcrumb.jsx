import { navigate } from "./navigation";

// Mobile Archive Interaction Pass -- Stage 0B (Universal Back to Archive):
// the explicit, designed path back to the Archive that Project pages lost
// when the old project-to-project bottom navigation was intentionally
// removed (see ProjectNavigation.jsx's own retirement comment, and
// ProjectTemplate.jsx's top comment for the full "four systems" breakdown
// this page was split into). Without this, a visitor who lands on a
// Project (a direct link, a refresh, Filter/Search from a child page) had
// no designed way back into the Archive other than the Logo, Menu, or the
// browser's own back button.
//
// Deliberately its own tiny component, not folded into Header.jsx: Header
// is one reusable global header rendered identically on every page, with
// no per-page slot or breadcrumb mechanism of its own (confirmed via the
// architecture review -- adding one would mean new plumbing Header doesn't
// need for anything else it does). Rendered instead by ProjectTemplate.jsx
// itself, as its own quiet row above .project-viewer -- see that file's
// own render for exactly where -- which is what guarantees this can never
// visually compete with the Project Information trigger / Archive Number /
// Image Navigation row beneath it (a separate row, a separate concern).
//
// navigate("/") is the exact mechanism the Logo and Menu's own "Archive"
// link already use (see navigation.js and Header.jsx's MENU_LINK_PATHS) --
// deliberately NOT browser history (history.back()), so this always lands
// on the Archive root regardless of how the Project was actually reached.
//
// Visual language: quiet, restrained, small -- reuses the exact same
// typography as the Archive Number (.project-archive-index__number in
// styles.css: 0.68rem / weight 400 / 0.1em letter-spacing / uppercase /
// #9d9d9d) rather than introducing a new type treatment, and carries no
// button chrome (no border, no background, no padding) -- it should read
// as a quiet piece of the page's own typography that happens to be
// interactive, the same restraint ProjectArchiveIndex's own button already
// established for this exact page.
//
// Desktop Project Page visual-matching pass (Josh review): two changes,
// both purely presentational -- the navigate("/") mechanism above, and
// everything about WHEN this renders, are completely untouched.
//
//   Glyph: the bare arrow "← " is replaced with "‹ ", a quieter chevron
//   per explicit instruction ("‹ Archive" or an equally restrained
//   equivalent) -- still aria-hidden, still purely decorative next to the
//   real "Archive" label a screen reader announces.
//
//   Alignment: this control now lines up with the header's own "Filter"
//   label, not with this page's own (deliberately wider) content padding.
//   See .project-breadcrumb's own comment in styles.css for the exact
//   mechanism -- a calc() pulling it back by the difference between the
//   two padding formulas, scoped to desktop only.
export default function ProjectBreadcrumb() {
  return (
    <div className="project-breadcrumb">
      <button
        type="button"
        className="project-breadcrumb__control"
        onClick={() => navigate("/")}
      >
        <span aria-hidden="true">{"‹ "}</span>
        Archive
      </button>
    </div>
  );
}
