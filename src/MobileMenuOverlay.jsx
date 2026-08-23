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
  links,
  linkPaths,
  activePath,
  onSelect,
}) {
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
        {links.map((label) => {
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
        })}
      </nav>
    </div>
  );
}
