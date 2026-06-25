// SelfeConnect brand mark — a teal speech-bubble with a check (recreated from
// the client's flyer) + the two-tone "Selfe / Connect" wordmark.

export const LOGO_MARK_SVG = `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18.5" cy="5" r="2.1" fill="#1D9E75"/>
  <circle cx="24" cy="3.4" r="2.1" fill="#1D9E75"/>
  <circle cx="29.5" cy="5" r="2.1" fill="#1D9E75"/>
  <path d="M24 9C14.3 9 6.5 15.9 6.5 24.5c0 3.7 1.5 7.1 4 9.8L8 42l8.7-2.8c2.2.9 4.7 1.4 7.3 1.4 9.7 0 17.5-6.9 17.5-15.6C41.5 15.9 33.7 9 24 9Z" fill="#1D9E75"/>
  <path d="M16.5 24.5l5 5 10-11" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// White variant for dark / teal backgrounds (white bubble, teal check).
export const LOGO_MARK_WHITE_SVG = `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18.5" cy="5" r="2.1" fill="#ffffff"/>
  <circle cx="24" cy="3.4" r="2.1" fill="#ffffff"/>
  <circle cx="29.5" cy="5" r="2.1" fill="#ffffff"/>
  <path d="M24 9C14.3 9 6.5 15.9 6.5 24.5c0 3.7 1.5 7.1 4 9.8L8 42l8.7-2.8c2.2.9 4.7 1.4 7.3 1.4 9.7 0 17.5-6.9 17.5-15.6C41.5 15.9 33.7 9 24 9Z" fill="#ffffff"/>
  <path d="M16.5 24.5l5 5 10-11" stroke="#1D9E75" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function LogoMark({
  className = "h-9 w-9",
  tone = "color",
}: {
  className?: string;
  tone?: "color" | "white";
}) {
  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: tone === "white" ? LOGO_MARK_WHITE_SVG : LOGO_MARK_SVG }}
    />
  );
}

export function Logo({
  withTagline = true,
  invert = false,
  markClassName = "h-9 w-9",
}: {
  withTagline?: boolean;
  invert?: boolean;
  markClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight">
          <span className={invert ? "text-primary-foreground" : "text-foreground"}>Selfe</span>
          <span className="text-primary">Connect</span>
        </span>
        {withTagline && (
          <span
            className={`text-[10px] font-medium tracking-wide ${invert ? "text-primary-foreground/80" : "text-muted-foreground"}`}
          >
            Independent. Impartial. Impactful.
          </span>
        )}
      </span>
    </span>
  );
}
