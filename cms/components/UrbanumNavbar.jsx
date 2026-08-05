import {useCurrentUser, useWorkspace} from 'sanity'
import {useRouterState} from 'sanity/router'
import {Avatar, Box, Flex, Menu, MenuButton, MenuDivider, MenuItem, Stack, Text} from '@sanity/ui'
import {UrbanumToolMenu} from './UrbanumToolMenu'
import {unstableSignOut} from '../unstableSignOut'

// Same ink value ImportWorkspace.jsx's own INK constant uses -- kept as
// a local literal rather than imported across files (the two components
// don't otherwise share a module), same reasoning UrbanumToolMenu.jsx
// already gives for its own duplicated NAV_INK/NAV_MUTED_INK.
const INK = '#1a1a1a'
// Same literal the Uploader's own Container background already uses
// (ImportWorkspace.jsx) -- not a new color, just applied to one more
// piece of shared chrome.
const SHELL_BACKGROUND = '#faf9f5'

// Milestone 2B: replaces Sanity's default Navbar via
// `studio.components.navbar` (see sanity.config.js). Deliberately does
// NOT call `renderDefault` -- per Sanity's own docs, skipping it means
// providing entirely custom markup for this slot, which is what's
// needed here.
//
// Investigated before writing this: `NavbarProps` (the installed 6.7.0
// types) exposes only `renderDefault` and an `@internal @beta`
// `__internal_actions` array -- nothing else about the default navbar
// (search, workspace switcher, tool overflow menu, user avatar/account
// menu) is exposed as a separate prop or sub-component we could keep
// selectively. Sanity's default Navbar renders all of that as one
// opaque unit; the only way to drop any part of it is to not render the
// default at all and rebuild only what we want. That's what this
// component does: search, the workspace switcher, and any tool-overflow
// menu are gone by omission, which is exactly Milestone 2B's "reduce
// visual noise" goal.
//
// Final UX polish pass ("Header navigation"), correcting the paragraph
// that used to be here: an earlier pass assumed `studio.components.
// toolMenu` (UrbanumToolMenu.jsx) was "a separate, sibling override
// point that Studio's layout renders independently of the navbar" --
// that assumption was wrong, and is why "Import / Library / Settings"
// never actually appeared. Read directly from the installed 6.7.0
// package's own compiled source (sanity/lib/index.js): `
// StudioLayoutComponent` resolves `Navbar = useNavbarComponent()` and
// renders it with zero props (`jsx(Navbar, {})`) -- it does not also
// resolve or render a ToolMenu itself. Sanity's own default `
// StudioNavbar` renders the ToolMenu as ITS OWN internal child (it calls
// `useToolMenuComponent()` and passes it `tools`/`activeToolName` itself
// -- confirmed at that function's own call site). Since this custom
// Navbar replaces `StudioNavbar` entirely and never called that hook or
// rendered a ToolMenu, `UrbanumToolMenu` was never being rendered
// anywhere in the running Studio, header or otherwise -- not "rendered
// as a placeholder," genuinely absent. `useToolMenuComponent` itself is
// not exported publicly (checked directly against the installed
// package's own index.d.ts export list -- absent), so it can't be
// called from here; instead this renders `UrbanumToolMenu` directly,
// sourcing the same two props it needs from fully `@public` hooks:
// `useWorkspace()` for `tools`, and `useRouterState()` (from
// `sanity/router`, also `@public`) for the active tool's name.
//
// Round E ("User Menu"): asked a third time for the account area to be
// "clickable and open the user/account menu." The gap disclosed in the
// previous two passes hasn't changed and won't: Sanity's public API
// surface still has no documented sign-out/account-menu component
// (`UserAvatar` exists but is `@hidden @beta` with no click/menu prop at
// all; no public `signOut`/`logout` action exists anywhere in the
// installed package's export table -- checked again, not assumed
// unchanged). There is no way to wire up literally Sanity's own native
// account control from here.
//
// What CAN be built, and is built below, is a real, functioning menu
// using @sanity/ui's own public `MenuButton`/`Menu`/`MenuItem`/
// `MenuDivider` (all `@public`, confirmed against the installed 3.5.0
// package's own type declarations -- not the same thing as inventing an
// internal Studio API). It is explicitly NOT a recreation of Sanity's
// native chrome -- it's a small, honest menu built from the same public
// building blocks any Studio plugin uses. Both the name text and the
// avatar are inside one clickable trigger, so either one opens the same
// menu -- there's no functional difference between clicking the two.
//
// Authentication pass ("Option A"): the paragraph above (Round E) is now
// out of date on one point and left here only as an accurate record of
// what was true at the time, not corrected in place. "No sign-out action
// is included -- that still isn't achievable through any public API" was
// correct as of Round E and is still correct about the *public* API
// surface -- see authentication-investigation.md for the full
// investigation this pass implements. What changed is that Sign Out below
// is now real, through one disclosed, isolated exception: see
// unstableSignOut.js for exactly what that exception is, why it exists,
// and how to remove it later. This is also why Round F/G's "Account
// Settings" link (linking out to manage.sanity.io) is gone rather than
// kept alongside Sign Out -- the investigation's own brief was explicit
// that the menu should read as "an application menu, not a
// developer/admin menu," and a real Sign Out control removes the one
// reason that external link existed (it was the only working action this
// menu had).
// Visual-polish pass ("Header," item 5): the temporary text wordmark is
// replaced with the real asset -- `public/urbanum-logo-transparent.svg`
// at the site root, the same file src/Logo.jsx already points the
// front-end site's own header at. This Studio project is a separate app
// (its own package.json/dev server, no shared `public/` folder to
// reference by URL), so the asset's path data is inlined directly as SVG
// markup rather than imported across that boundary -- same visual result
// as the front-end's <img>, no new build step or cross-project file
// dependency. Colors (`#343434`/`white`) are copied unchanged from the
// source file, not reinterpreted.
//
// Visual-polish pass, round 2 ("finish the header"): sized up from 18 to
// 26 -- reported as "noticeably too small" against the mockup. 26 keeps
// the same aspect ratio (viewBox 1024:219) so the mark isn't stretched,
// just larger; paddingY={3} on the Flex below is unchanged, so the
// header band itself doesn't grow, only the logo within it.
function UrbanumLogo() {
  return (
    <svg
      viewBox="0 0 1024 219"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{height: 26, width: 'auto', display: 'block'}}
      aria-label="urbānum"
      role="img"
    >
      <g clipPath="url(#urbanum-navbar-logo-clip)">
        <path d="M117.54 112.9C117.547 115.96 117.547 129.74 117.54 154.24C117.54 154.396 117.602 154.547 117.713 154.657C117.823 154.768 117.974 154.83 118.13 154.83L133.63 154.82C133.917 154.82 134.193 154.932 134.397 155.133C134.601 155.333 134.717 155.605 134.72 155.89V156.82C134.72 157.088 134.613 157.345 134.421 157.534C134.23 157.724 133.971 157.83 133.7 157.83L114.64 157.85C114.509 157.85 114.383 157.799 114.29 157.707C114.196 157.615 114.143 157.491 114.14 157.36C114.093 155.96 114.057 141.143 114.03 112.91C114.003 84.67 114.01 69.85 114.05 68.45C114.051 68.3843 114.066 68.3196 114.092 68.2594C114.118 68.1992 114.156 68.1448 114.203 68.0993C114.251 68.0538 114.307 68.0181 114.368 67.9942C114.429 67.9703 114.494 67.9587 114.56 67.96L133.61 67.94C133.744 67.94 133.877 67.9661 134 68.0169C134.124 68.0676 134.237 68.142 134.331 68.2358C134.426 68.3296 134.501 68.4409 134.552 68.5635C134.604 68.686 134.63 68.8174 134.63 68.95L134.64 69.88C134.64 70.1664 134.525 70.4411 134.321 70.6437C134.116 70.8462 133.839 70.96 133.55 70.96L118.05 70.98C117.973 70.98 117.896 70.9953 117.824 71.0249C117.753 71.0546 117.688 71.098 117.633 71.1528C117.578 71.2076 117.535 71.2726 117.505 71.3442C117.475 71.4158 117.46 71.4925 117.46 71.57C117.513 96.07 117.54 109.847 117.54 112.9Z" fill="#343434" />
        <path d="M379.2 143.47L378.16 152.02C378.138 152.196 378.052 152.358 377.918 152.476C377.783 152.594 377.61 152.659 377.43 152.66H366.25C366.169 152.66 366.088 152.644 366.013 152.613C365.938 152.582 365.869 152.536 365.812 152.478C365.754 152.421 365.708 152.352 365.677 152.277C365.646 152.202 365.63 152.121 365.63 152.04V68.19C365.63 68.0998 365.666 68.0133 365.73 67.9496C365.793 67.8858 365.88 67.85 365.97 67.85H379.79C379.865 67.85 379.939 67.865 380.008 67.8941C380.077 67.9233 380.14 67.966 380.193 68.0199C380.246 68.0737 380.288 68.1377 380.317 68.208C380.345 68.2784 380.36 68.3538 380.36 68.43V99.82C380.362 99.8716 380.38 99.9214 380.411 99.9624C380.443 100.003 380.486 100.034 380.536 100.049C380.585 100.064 380.638 100.064 380.687 100.048C380.736 100.032 380.779 100.001 380.81 99.96C386.177 92.2333 393.543 89.0767 402.91 90.49C418.78 92.88 424.26 109.7 423.73 123.78C423.11 140.57 414.15 155.22 395.33 153.29C389.277 152.67 384.753 150.15 381.76 145.73C381.493 145.337 380.847 144.523 379.82 143.29C379.777 143.236 379.718 143.197 379.653 143.176C379.587 143.155 379.516 143.155 379.45 143.174C379.384 143.193 379.325 143.231 379.28 143.284C379.236 143.337 379.208 143.401 379.2 143.47ZM379.85 121.85C379.82 130.98 382.47 142.22 394.01 142.26C405.56 142.29 408.28 131.07 408.31 121.94C408.34 112.8 405.69 101.57 394.14 101.53C382.6 101.49 379.87 112.71 379.85 121.85Z" fill="#343434" />
        <path d="M512.23 67.85H474.05C473.79 67.85 473.58 68.0604 473.58 68.32V77.3C473.58 77.5596 473.79 77.77 474.05 77.77H512.23C512.49 77.77 512.7 77.5596 512.7 77.3V68.32C512.7 68.0604 512.49 67.85 512.23 67.85Z" fill="#343434" />
        <path d="M930.14 112.91C930.133 141.17 930.107 156 930.06 157.4C930.055 157.532 930 157.656 929.907 157.748C929.813 157.839 929.689 157.89 929.56 157.89H910.49C910.219 157.89 909.96 157.784 909.769 157.594C909.577 157.405 909.47 157.148 909.47 156.88V155.95C909.47 155.664 909.585 155.389 909.789 155.186C909.994 154.984 910.271 154.87 910.56 154.87H926.07C926.226 154.87 926.377 154.808 926.487 154.697C926.598 154.587 926.66 154.436 926.66 154.28C926.633 129.76 926.62 115.97 926.62 112.91C926.62 109.857 926.637 96.07 926.67 71.55C926.67 71.3935 926.608 71.2435 926.497 71.1328C926.387 71.0222 926.236 70.96 926.08 70.96H910.57C910.281 70.96 910.004 70.8462 909.799 70.6437C909.595 70.4411 909.48 70.1664 909.48 69.88V68.95C909.48 68.6821 909.587 68.4252 909.779 68.2358C909.97 68.0464 910.229 67.94 910.5 67.94H929.57C929.699 67.94 929.823 67.991 929.917 68.0823C930.01 68.1737 930.065 68.2983 930.07 68.43C930.117 69.83 930.14 84.6567 930.14 112.91Z" fill="#343434" />
        <path d="M300.7 105.76C300.713 105.753 301.437 104.287 302.87 101.36C306.563 93.8133 312.63 90.06 321.07 90.1C321.213 90.1 321.351 90.1569 321.452 90.2582C321.553 90.3594 321.61 90.4968 321.61 90.64V104.03C321.61 104.1 321.596 104.168 321.569 104.232C321.541 104.296 321.501 104.354 321.45 104.402C321.4 104.449 321.34 104.486 321.274 104.51C321.209 104.534 321.139 104.544 321.07 104.54C307.42 103.78 301.63 112.06 301.5 124.76C301.407 133.987 301.403 143.167 301.49 152.3C301.49 152.393 301.454 152.482 301.39 152.547C301.327 152.613 301.24 152.65 301.15 152.65H287.11C287.012 152.65 286.918 152.611 286.848 152.542C286.779 152.472 286.74 152.378 286.74 152.28V91.55C286.74 91.4519 286.779 91.3578 286.848 91.2884C286.918 91.219 287.012 91.18 287.11 91.18H299.94C300.089 91.18 300.231 91.239 300.336 91.344C300.441 91.449 300.5 91.5915 300.5 91.74L300.35 105.46C300.349 105.504 300.358 105.548 300.377 105.588C300.395 105.628 300.421 105.663 300.455 105.692C300.488 105.721 300.527 105.742 300.57 105.753C300.612 105.765 300.657 105.767 300.7 105.76Z" fill="#343434" />
        <path d="M505.5 142.44C505.498 142.381 505.478 142.324 505.441 142.278C505.405 142.231 505.356 142.197 505.299 142.181C505.243 142.164 505.182 142.166 505.127 142.185C505.071 142.205 505.023 142.242 504.99 142.29L501.87 146.89C501.823 146.957 501.77 147.02 501.71 147.08C496.363 152.22 489.46 154.317 481 153.37C474.49 152.65 468.34 149.45 465.51 143.67C462.1 136.73 463.45 127.49 470.22 122.93C475.3 119.5 481.81 118.15 487.75 117.25C490.01 116.903 495.333 116.24 503.72 115.26C503.848 115.243 503.965 115.181 504.051 115.084C504.137 114.986 504.187 114.861 504.19 114.73C504.29 109.25 503.26 103.02 497.03 101.49C489.69 99.69 481.72 102.15 480.88 110.78C480.863 110.948 480.786 111.103 480.664 111.216C480.542 111.328 480.384 111.39 480.22 111.39H466.5C466.378 111.39 466.257 111.364 466.146 111.312C466.035 111.261 465.936 111.186 465.857 111.093C465.778 111 465.72 110.89 465.688 110.772C465.656 110.654 465.65 110.531 465.67 110.41C467.09 101.283 472.017 95.21 480.45 92.19C486.743 89.9433 493.707 89.5267 501.34 90.94C512.387 92.9933 518.2 99.8833 518.78 111.61C519.32 122.57 517.85 138.92 520.79 152.28C520.799 152.326 520.798 152.374 520.787 152.419C520.776 152.464 520.755 152.507 520.727 152.543C520.698 152.579 520.662 152.609 520.621 152.629C520.58 152.649 520.535 152.66 520.49 152.66H506.52C506.249 152.657 505.989 152.549 505.798 152.358C505.607 152.167 505.5 151.909 505.5 151.64V142.44ZM503.75 123.67C497.377 124.47 492.153 125.273 488.08 126.08C482.53 127.17 477.7 130.52 479.35 136.91C480.083 139.777 482.14 141.61 485.52 142.41C497.64 145.29 505.87 135.91 504.37 124.15C504.361 124.078 504.338 124.008 504.302 123.944C504.266 123.881 504.218 123.825 504.161 123.78C504.103 123.735 504.037 123.703 503.966 123.684C503.896 123.665 503.822 123.66 503.75 123.67Z" fill="#343434" />
        <path d="M582.8 102.42C582.8 102.459 582.812 102.496 582.835 102.528C582.858 102.559 582.891 102.582 582.928 102.593C582.965 102.604 583.005 102.603 583.041 102.59C583.077 102.577 583.109 102.552 583.13 102.52C584.277 100.78 585.063 99.6033 585.49 98.99C589.543 93.21 595.29 90.2833 602.73 90.21C618.97 90.04 623.48 101.84 623.47 115.75C623.47 119.403 623.477 131.547 623.49 152.18C623.49 152.305 623.44 152.424 623.352 152.512C623.264 152.6 623.145 152.65 623.02 152.65H609.06C609.005 152.65 608.95 152.639 608.899 152.618C608.848 152.597 608.802 152.566 608.763 152.527C608.724 152.488 608.693 152.442 608.672 152.391C608.651 152.34 608.64 152.285 608.64 152.23C608.593 141.257 608.59 129.68 608.63 117.5C608.66 109.38 606.7 101.42 596.52 101.86C588.01 102.24 583.86 109.97 583.72 117.77C583.573 126.363 583.553 137.82 583.66 152.14C583.661 152.206 583.649 152.273 583.625 152.334C583.6 152.396 583.564 152.453 583.517 152.5C583.471 152.548 583.415 152.585 583.354 152.611C583.292 152.637 583.226 152.65 583.16 152.65H569.19C569.092 152.65 568.998 152.611 568.928 152.542C568.859 152.472 568.82 152.378 568.82 152.28V91.81C568.82 91.6429 568.885 91.4827 569.002 91.3645C569.118 91.2464 569.276 91.18 569.44 91.18H582.39C582.499 91.18 582.603 91.2232 582.68 91.3001C582.757 91.377 582.8 91.4813 582.8 91.59V102.42Z" fill="#343434" />
        <path d="M789.33 101.24C789.331 101.31 789.355 101.378 789.399 101.432C789.443 101.487 789.505 101.525 789.573 101.54C789.642 101.555 789.713 101.546 789.776 101.515C789.839 101.485 789.89 101.433 789.92 101.37C793.25 93.86 799.28 90.26 807.51 90.18C815.61 90.1 821.32 94.0167 824.64 101.93C824.657 101.974 824.687 102.012 824.725 102.04C824.764 102.067 824.81 102.083 824.858 102.085C824.906 102.087 824.954 102.076 824.997 102.052C825.04 102.028 825.076 101.993 825.1 101.95C830.06 92.6567 837.79 88.88 848.29 90.62C852.317 91.2867 855.783 93.6033 858.69 97.57C861.9 101.96 862.64 107.98 862.63 114.08C862.617 125.373 862.617 138.073 862.63 152.18C862.63 152.305 862.581 152.424 862.492 152.512C862.404 152.6 862.285 152.65 862.16 152.65H848.46C848.304 152.65 848.153 152.588 848.043 152.477C847.932 152.367 847.87 152.216 847.87 152.06C847.903 134.573 847.9 121.803 847.86 113.75C847.82 105.06 842.34 99.67 833.66 102.57C828.79 104.19 826.41 109.98 826.37 114.83C826.283 125.063 826.27 137.503 826.33 152.15C826.33 152.285 826.276 152.415 826.181 152.511C826.085 152.606 825.955 152.66 825.82 152.66H812.09C811.947 152.66 811.809 152.602 811.708 152.499C811.607 152.396 811.55 152.256 811.55 152.11C811.61 136.103 811.597 123.073 811.51 113.02C811.47 107.34 808.59 102.04 802 101.81C793.69 101.52 790.09 109.06 790.09 116.44C790.097 132.507 790.107 144.433 790.12 152.22C790.12 152.334 790.075 152.443 789.994 152.524C789.913 152.605 789.804 152.65 789.69 152.65H775.86C775.727 152.65 775.6 152.597 775.506 152.504C775.413 152.41 775.36 152.283 775.36 152.15V91.5C775.36 91.4125 775.395 91.3285 775.457 91.2667C775.519 91.2048 775.602 91.17 775.69 91.17H788.76C788.911 91.17 789.056 91.2311 789.163 91.3399C789.27 91.4486 789.33 91.5962 789.33 91.75V101.24Z" fill="#343434" />
        <path d="M222.59 142.23C222.588 142.165 222.565 142.103 222.523 142.053C222.482 142.003 222.425 141.969 222.362 141.955C222.299 141.941 222.233 141.949 222.174 141.977C222.116 142.005 222.069 142.052 222.04 142.11C217.32 152.36 205.32 155.84 194.96 152.23C185.43 148.92 182.8 139.59 182.82 130.25C182.833 117.023 182.827 104.113 182.8 91.52C182.8 91.4325 182.835 91.3485 182.897 91.2867C182.959 91.2248 183.042 91.19 183.13 91.19H197.19C197.309 91.19 197.424 91.2374 197.508 91.3218C197.593 91.4062 197.64 91.5207 197.64 91.64C197.573 112.833 197.59 125.87 197.69 130.75C197.86 139.19 205.54 144.55 213.45 140.91C219.3 138.22 221.7 131.82 221.73 125.5C221.743 119.887 221.743 108.657 221.73 91.81C221.73 91.6403 221.797 91.4775 221.917 91.3575C222.037 91.2374 222.2 91.17 222.37 91.17H236.29C236.384 91.17 236.474 91.2065 236.541 91.2719C236.608 91.3372 236.647 91.4263 236.65 91.52L236.67 152.25C236.67 152.356 236.627 152.458 236.55 152.533C236.473 152.608 236.369 152.65 236.26 152.65H223.24C223.068 152.65 222.902 152.583 222.78 152.463C222.658 152.343 222.59 152.18 222.59 152.01V142.23Z" fill="#343434" />
        <path d="M710.34 142.23C710.338 142.165 710.315 142.103 710.273 142.053C710.232 142.003 710.175 141.969 710.112 141.955C710.049 141.941 709.983 141.949 709.924 141.977C709.866 142.005 709.819 142.052 709.79 142.11C705.07 152.36 693.06 155.84 682.7 152.23C673.17 148.91 670.54 139.58 670.56 130.24C670.58 117.007 670.577 104.093 670.55 91.5C670.55 91.4125 670.585 91.3285 670.647 91.2667C670.709 91.2048 670.792 91.17 670.88 91.17H684.95C685.069 91.17 685.184 91.2174 685.268 91.3018C685.353 91.3862 685.4 91.5007 685.4 91.62C685.327 112.82 685.34 125.86 685.44 130.74C685.6 139.19 693.28 144.55 701.2 140.91C707.05 138.22 709.45 131.82 709.48 125.5C709.5 119.887 709.503 108.653 709.49 91.8C709.49 91.6303 709.557 91.4675 709.677 91.3475C709.797 91.2274 709.96 91.16 710.13 91.16H724.06C724.155 91.16 724.247 91.1979 724.315 91.2654C724.382 91.333 724.42 91.4245 724.42 91.52V152.26C724.42 152.366 724.377 152.468 724.3 152.543C724.223 152.618 724.119 152.66 724.01 152.66H710.99C710.818 152.66 710.652 152.593 710.53 152.473C710.408 152.353 710.34 152.19 710.34 152.02V142.23Z" fill="#343434" />
        <path d="M504.37 124.15C505.87 135.91 497.64 145.29 485.52 142.41C482.14 141.61 480.083 139.777 479.35 136.91C477.7 130.52 482.53 127.17 488.08 126.08C492.153 125.273 497.377 124.47 503.75 123.67C503.822 123.66 503.896 123.665 503.966 123.684C504.037 123.703 504.103 123.735 504.161 123.78C504.218 123.825 504.267 123.881 504.302 123.944C504.338 124.008 504.361 124.078 504.37 124.15Z" fill="white" />
      </g>
      <defs>
        <clipPath id="urbanum-navbar-logo-clip">
          <rect width="1024" height="219" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

// Sanity's own `Avatar` primitive (@sanity/ui, confirmed exported/public
// in the installed 3.5.0 package) plus `currentUser.profileImage`/`name`
// -- both public fields on `useCurrentUser()`'s own `CurrentUser` type
// (checked directly against the installed sanity/@sanity/types
// declarations) -- rather than any hand-rolled avatar/profile logic.
// Falls back to Sanity's own initials rendering when there's no
// profileImage, same component either way.
function initialsFor(name) {
  if (!name) return undefined
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

// Authentication pass ("Option A"): `provider` is a `@public` field on
// `useCurrentUser()`'s own `CurrentUser` type (installed @sanity/types
// declarations), holding the same lowercase identifier Sanity's auth
// provider list itself uses (confirmed against this project's own live
// provider list during investigation: `'google'`, not a display string) --
// sourced from the real value rather than hardcoding "Google" as literal
// text, even though `auth.providers` (sanity.config.js) currently
// restricts this project to Google alone, so the two would read the same
// today either way.
function providerTitleFor(provider) {
  if (!provider) return undefined
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

// The account menu's trigger has to be a real, focusable element
// (`MenuButton` clones its `button` prop and attaches its own onClick/
// aria-expanded/ref onto it) -- a plain native <button> satisfies that
// with zero risk of @sanity/ui's own Button re-computing colors out
// from under it (see ImportWorkspace.jsx's `inverseButtonStyle` comment
// for the same class of problem elsewhere in this project). This resets
// only what native <button> elements don't already inherit from the
// page (background/border/font/cursor) -- everything else about how the
// name+avatar look is unchanged from before this was clickable.
const accountTriggerStyle = {
  background: 'none',
  border: 'none',
  padding: 4,
  margin: 0,
  cursor: 'pointer',
  font: 'inherit',
  borderRadius: 4,
}

export function UrbanumNavbar() {
  const currentUser = useCurrentUser()
  const {tools} = useWorkspace()
  // Mirrors exactly how Sanity's own `StudioNavbar` derives this same
  // value (confirmed at its call site): the router's `tool` param, or
  // undefined when there isn't one (e.g. no tool has taken the route
  // yet). `useRouterState`'s selector overload re-renders this component
  // only when the derived value itself changes, not on every router
  // state change.
  const activeToolName = useRouterState((routerState) =>
    typeof routerState.tool === 'string' ? routerState.tool : undefined,
  )

  // Authentication pass ("Option A"): the only caller of `unstableSignOut`
  // in the project (see that file for the isolated `@internal` exception
  // this wraps, and authentication-investigation.md for why it's
  // necessary at all). The `window.location.reload()` here isn't a DOM
  // hack or a workaround -- it's a plain, ordinary browser navigation, the
  // same category of public API `router.navigateUrl` elsewhere in this
  // project already relies on. It's necessary because the `AuthStore`
  // `unstableSignOut` constructs to call `logout()` on isn't the one
  // Studio's own running `AuthBoundary` is subscribed to (that instance
  // isn't exposed publicly either) -- clearing the underlying session
  // doesn't by itself guarantee this already-mounted Studio notices.
  // Reloading makes Studio re-boot from scratch, re-probe the now-cleared
  // session, and -- because `auth.redirectOnSingle` is enabled in
  // sanity.config.js and Google is the only configured provider -- land
  // straight back in the Google sign-in flow, same as visiting Studio cold
  // and signed out. Best-effort on failure: reloads either way, since a
  // failed sign-out attempt just leaves the user still signed in after
  // reload, no worse off than before they clicked.
  const handleSignOut = async () => {
    try {
      await unstableSignOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      window.location.reload()
    }
  }

  return (
    // Three flex-basis sections (left/center/right, outer two `flex: 1`)
    // rather than a single `justify="space-between"` row -- the same
    // left/center/right composition Sanity's own default header uses
    // (its `NavGrid` is literally `grid-template-columns: 1fr auto 1fr`
    // at this width, confirmed in the installed package's own source).
    // With only `space-between` and three children of unequal width, the
    // tool menu would land off-center whenever the logo and avatar
    // sections aren't the same width -- this keeps it genuinely centered
    // regardless.
    // UI cohesion pass ("Shared Application Shell"): the only change in
    // this component -- a background color, nothing else. Previously
    // unset, which meant this rendered on Sanity's own default card
    // background (white), stark against the Uploader's warm off-white
    // and visually disconnected from it. This applies globally, since
    // this Navbar is shared chrome across Import/Archive/System --
    // the point is for all three to read as one application, not for
    // Import to get special treatment. Layout, nav links, and the
    // account menu are all unchanged; text stays the same INK/muted-gray
    // already used against this exact background in the Uploader, so
    // contrast is unaffected.
    <Flex align="center" paddingX={4} paddingY={3} style={{backgroundColor: SHELL_BACKGROUND}}>
      <Flex align="center" style={{flex: 1}}>
        <UrbanumLogo />
      </Flex>
      <UrbanumToolMenu tools={tools} context="topbar" activeToolName={activeToolName} />
      <Flex align="center" justify="flex-end" style={{flex: 1}}>
        {currentUser ? (
          <MenuButton
            id="urbanum-account-menu"
            button={
              <button type="button" style={accountTriggerStyle}>
                <Flex align="center" gap={3}>
                  <Text size={1} muted>
                    {currentUser.name}
                  </Text>
                  <Avatar
                    src={currentUser.profileImage}
                    initials={initialsFor(currentUser.name)}
                    size={1}
                  />
                </Flex>
              </button>
            }
            menu={
              // Authentication pass ("Option A"): replaces the previous
              // name/email block + "Account Settings ↗" external link with
              // the menu the investigation specified -- identity, how the
              // user is signed in, Sign Out. No link out to
              // manage.sanity.io anymore: with a working Sign Out, that
              // external link no longer has a reason to be here (see the
              // file-level comment above), and the brief was explicit that
              // this should read as "an application menu, not a
              // developer/admin menu."
              <Menu>
                <Box padding={3} style={{minWidth: 220}}>
                  <Stack space={2}>
                    <Text size={1} style={{fontWeight: 500, color: INK}}>
                      {currentUser.name}
                    </Text>
                    {currentUser.email && (
                      <Text size={1} muted style={{fontSize: '0.8rem'}}>
                        {currentUser.email}
                      </Text>
                    )}
                    {providerTitleFor(currentUser.provider) && (
                      <Text size={1} muted style={{fontSize: '0.75rem'}}>
                        Signed in with {providerTitleFor(currentUser.provider)}
                      </Text>
                    )}
                  </Stack>
                </Box>
                <MenuDivider />
                <MenuItem text="Sign Out" onClick={handleSignOut} />
              </Menu>
            }
            popover={{portal: true, placement: 'bottom-end', preventOverflow: true}}
          />
        ) : null}
      </Flex>
    </Flex>
  )
}
