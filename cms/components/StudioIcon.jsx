// Urbanum Studio's branding icon. Reuses the exact same mark already
// serving as the public site's favicon (public/favicon.svg in the
// frontend) so Studio and the live site share one visual identity
// instead of Studio keeping Sanity's generic default sunburst. Inlined
// as SVG rather than referencing a file from Studio's own static/
// folder -- it's small enough that inlining avoids an extra network
// request for no benefit.
//
// This is the current, correct way to brand Studio: the older
// studio.components.logo override stopped working as of Studio
// v3.23.0 (this project is on v6.6.0) -- the supported mechanism now is
// the top-level `icon` field in defineConfig (see sanity.config.js),
// which is exactly what this component is passed to.
export function StudioIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
      <rect width="64" height="64" fill="#f5efe4" />
      <text
        x="50%"
        y="50%"
        fill="#000000"
        fontFamily="'Courier New', Courier, monospace"
        fontSize="44"
        fontWeight="400"
        textAnchor="middle"
        dominantBaseline="central"
      >
        u
      </text>
    </svg>
  )
}
