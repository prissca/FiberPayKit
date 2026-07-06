/**
 * FiberPayKit logo — a hexagonal fiber-network node with three glowing
 * fiber-optic strands weaving through a central payment bolt. Rendered as inline
 * SVG so it stays crisp, themeable, and glows via the neon gradients.
 */

export function LogoMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const id = "fpk"; // gradient id namespace
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="FiberPayKit"
    >
      <defs>
        <linearGradient id={`${id}-holo`} x1="8" y1="6" x2="56" y2="60">
          <stop offset="0" stopColor="#7ee7ff" />
          <stop offset="0.5" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#ff5cf0" />
        </linearGradient>
        <linearGradient id={`${id}-bolt`} x1="26" y1="12" x2="40" y2="52">
          <stop offset="0" stopColor="#eafbff" />
          <stop offset="0.55" stopColor="#7ee7ff" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
        <radialGradient id={`${id}-glass`} cx="35%" cy="28%" r="75%">
          <stop offset="0" stopColor="#232c4a" />
          <stop offset="1" stopColor="#0a0e1c" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hex body with beveled glass fill */}
      <path
        d="M32 3.5 55.4 17v30L32 60.5 8.6 47V17z"
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-holo)`}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* top gloss highlight */}
      <path
        d="M32 3.5 55.4 17 32 30.5 8.6 17z"
        fill="#ffffff"
        opacity="0.06"
      />

      {/* Woven fiber strands */}
      <g filter={`url(#${id}-glow)`} opacity="0.95">
        <path
          d="M15 40c8-4 8-14 17-16"
          stroke="#2dd4ff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M49 24c-8 4-8 14-17 16"
          stroke="#ff5cf0"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </g>

      {/* Central payment bolt */}
      <path
        d="M35.5 14 24 35h7.5l-3.5 15 16-22h-8l3.5-8z"
        fill={`url(#${id}-bolt)`}
        filter={`url(#${id}-glow)`}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Node dots at strand ends */}
      <circle cx="15" cy="40" r="2.4" fill="#2dd4ff" filter={`url(#${id}-glow)`} />
      <circle cx="49" cy="24" r="2.4" fill="#ff5cf0" filter={`url(#${id}-glow)`} />
    </svg>
  );
}

export function Logo({
  size = 34,
  withWord = true,
}: {
  size?: number;
  withWord?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWord && (
        <span className="text-[17px] font-bold tracking-tight">
          <span className="holo-text">Fiber</span>
          <span className="text-white">PayKit</span>
        </span>
      )}
    </span>
  );
}
