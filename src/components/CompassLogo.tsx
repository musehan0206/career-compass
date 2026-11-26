interface CompassLogoProps {
  size?: number;
  spinning?: boolean;
  className?: string;
}

export function CompassLogo({
  size = 44,
  spinning = false,
  className = '',
}: CompassLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${spinning ? 'compass-spin' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="29" fill="#14284B" />
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="#FAF7F0"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="32" r="18" stroke="#1AA3A5" strokeWidth="1.75" />
      <path
        d="M32 6V11M32 53V58M6 32H11M53 32H58"
        stroke="#FAF7F0"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g className={spinning ? 'compass-needle-oscillate' : ''}>
        <polygon points="32,14 37,32 32,29 27,32" fill="#2CC5C8" />
        <polygon points="32,50 37,32 32,35 27,32" fill="#FAF7F0" />
        <circle
          cx="32"
          cy="32"
          r="3.2"
          fill="#14284B"
          stroke="#FAF7F0"
          strokeWidth="1.6"
        />
      </g>
    </svg>
  );
}

