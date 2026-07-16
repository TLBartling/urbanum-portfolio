// Shared wordmark. Presentation-agnostic on purpose: this component only
// knows the logo's source asset and alt text. Every consumer (the header
// today, the splash/landing page later) supplies its own positioning and
// sizing via `className`, so adding a new placement never means touching
// this file or duplicating the <img> markup.
export default function Logo({ className }) {
  return (
    <img
      className={className}
      src="/urbanum-logo-transparent.svg"
      alt="urbānum"
    />
  );
}
