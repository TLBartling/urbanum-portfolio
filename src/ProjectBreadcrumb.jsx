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
// Typography refinement pass (surgical project-page interaction pass):
// the shared Archive Number treatment above included uppercase, which
// this control inherited too -- fine for the actual Archive Number (a
// short numeric label), but visibly ALL-CAPS "ARCHIVE" here, which is
// explicitly the conventional/generic look this pass moves away from.
// text-transform is now `none` for this control specifically (see
// styles.css), so "Archive" renders with its own natural JSX casing
// (capital A, lowercase remainder) instead. letter-spacing also moves
// off the shared 0.1em (calibrated for uppercase glyphs, where it reads
// as normal tracking) onto a lighter, restrained value scoped to
// .project-breadcrumb__label alone -- 0.1em on mixed-case text reads as
// noticeably loose, not the "subtle... editorial" spacing asked for.
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
export default function ProjectBreadcrumb({ isInfoOpen = false, onToggleInfo } = {}) {
  return (
    <div className="project-breadcrumb">
      <button
        type="button"
        className="project-breadcrumb__control"
        onClick={() => navigate("/")}
      >
        {/* Chevron + label typography pass: split into two spans so the
            gap between them is a real, tunable CSS gap (see
            .project-breadcrumb__control's own flex `gap` in styles.css)
            rather than a literal space character baked into the
            chevron's own text -- and so ARCHIVE's own uppercase (from
            the shared Archive Number treatment this control's typography
            otherwise still reuses) can be turned off for this label
            alone without touching that shared rule or the chevron glyph
            it doesn't apply to anyway. "Archive" keeps its own natural
            capital-A/lowercase casing here in the JSX -- previously
            invisible either way while the CSS forced it fully uppercase. */}
        <span aria-hidden="true" className="project-breadcrumb__chevron">
          ‹
        </span>
        <span className="project-breadcrumb__label">Archive</span>
      </button>
      {/* Mobile back-control pass (client-approved): mobile gets the same
          simple "X" visual language the mobile Menu close control already
          uses (.mobile-menu-overlay__close in styles.css) instead of the
          "‹ Archive" chevron+label above -- desktop keeps that control
          exactly as it is (see this component's own top comment). Same
          navigate("/") action as the control above, nothing new; which of
          the two buttons is actually visible/hit-testable is decided
          purely by CSS at the ~640px mobile breakpoint (see
          .project-breadcrumb__mobile-close in styles.css), the same
          breakpoint useIsMobileUiMode already uses elsewhere for "mobile
          UI mode," so no JS mobile-detection branch was needed here. */}
      {/* Mobile Project Info X fix (non-Archive mobile refinements round):
          this is still the one and only mobile "X" -- never a second
          control -- but what it DOES now depends on whether Project
          Information is open. Previously this always called navigate("/"),
          so opening Info (a full-screen-reading opaque overlay on mobile)
          left this same top-right X still visibly meaning "leave Project,"
          which is confusing and, worse, actually did exit the Project
          instead of closing Info. isInfoOpen/onToggleInfo are the exact
          same isInfoOpen state and handleToggleInfo function
          ProjectInfoTrigger/ProjectArchiveIndex already share (see
          ProjectTemplate.jsx's own comment on why there is only ever one
          open/closed boolean with multiple entry points) -- passed down
          from ProjectTemplate.jsx so this control becomes a third entry
          point to that same toggle, not a new, independently tracked
          state. While Info is open this X closes Info only (same image,
          same index, no navigation); once Info is closed it goes back to
          meaning "leave Project" exactly as before. Purely a behavior/
          aria-label change -- glyph, sizing, and position are completely
          unchanged. */}
      <button
        type="button"
        className="project-breadcrumb__mobile-close"
        onClick={isInfoOpen ? onToggleInfo : () => navigate("/")}
        aria-label={isInfoOpen ? "Close project information" : "Back to Archive"}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
