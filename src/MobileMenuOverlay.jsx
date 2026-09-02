import { useEffect } from "react";

// Mobile Header/Search/Menu Refinement Pass -- Section 3 (Mobile Menu, Full-
// Screen Vertical Overlay): mobile UI mode's entire entrance into site
// navigation. Structurally parallel to MobileSearchOverlay.jsx -- a
// purpose-built, single-screen surface instantiated from Header.jsx, NOT a
// mobile-conditional render of the desktop .index-drawer Menu row -- per
// the explicit "do NOT reuse the desktop drawer visually" requirement.
//
// This component owns no state of its own beyond its Escape-key listener
// (mirroring MobileSearchOverlay's own, entirely separate, self-contained
// Escape handling -- see that file's own comment on why this isn't folded
// into Header's shared drawer Escape effect). Every other piece of
// information it needs -- which links exist, which path each one goes to,
// which one is currently active, what happens when one is picked -- is a
// plain prop from Header.jsx, which already owns MENU_LINKS/
// MENU_LINK_PATHS/beginPageTransition/navigate for the desktop Menu. There
// is no second navigation table and no second transition mechanism here.
export default function MobileMenuOverlay({
  isOpen,
  onClose,
  linksBeforeSearch,
  linksAfterSearch,
  linkPaths,
  activePath,
  onSelect,
  onSearchOpen,
}) {
  // Mobile Menu order/copy pass (client-approved): a page link is rendered
  // identically regardless of which side of Search it falls on -- same
  // active-state check, same click handler, same class -- so this is one
  // shared render function called from two places below rather than the
  // old single links.map() duplicated.
  const renderLink = (label) => {
    const isActive = activePath === linkPaths[label];
    return (
      <button
        type="button"
        key={label}
        className={`mobile-menu-overlay__link${
          isActive ? " mobile-menu-overlay__link--active" : ""
        }`}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onSelect(label)}
      >
        {label}
      </button>
    );
  };
  // Same Escape-to-close convention MobileSearchOverlay already uses.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mobile-menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
    >
      <div className="mobile-menu-overlay__top-row">
        <button
          type="button"
          className="mobile-menu-overlay__close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <nav className="mobile-menu-overlay__links" aria-label="Site navigation">
        {linksBeforeSearch.map(renderLink)}
        {/* Mobile Header/Search/Menu Refinement Pass -- Section 8 (Mobile
            Search Relocation): Search moved here from the mobile top
            header (see Header.jsx's own Section 8 comment). Deliberately
            NOT part of linksBeforeSearch/linksAfterSearch/onSelect above --
            those are a real page-navigation table (active-state
            highlighting, actual routes) and Search isn't a page, it opens
            the existing mobile Search/discovery overlay instead.
            onSearchOpen is the same handleMobileSearchOpen the header's
            old visible Search button used to call -- no new search logic,
            just a different trigger surface. Reuses the exact
            .mobile-menu-overlay__link class the page links use (same type
            family/size/weight/spacing, same generous touch target) so it
            reads as one consistent list, not a bolted-on extra control --
            just never gets aria-current/--active since it isn't a
            "current page." Mobile Menu order/copy pass: now positioned
            between linksBeforeSearch and linksAfterSearch (Contact and
            Journal) per the client-approved order, rather than always
            first. */}
        <button
          type="button"
          className="mobile-menu-overlay__link"
          onClick={onSearchOpen}
        >
          Search
        </button>
        {linksAfterSearch.map(renderLink)}
      </nav>
    </div>
  );
}
