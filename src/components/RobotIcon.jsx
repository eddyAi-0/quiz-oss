// Robottino SVG: i colori seguono le variabili del tema (chiaro/scuro).
export default function RobotIcon({ size = 96, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* antenna */}
      <line x1="60" y1="16" x2="60" y2="32" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="11" r="6" fill="var(--primary)" />
      {/* orecchie */}
      <rect x="16" y="55" width="10" height="22" rx="5" fill="var(--primary)" />
      <rect x="94" y="55" width="10" height="22" rx="5" fill="var(--primary)" />
      {/* testa */}
      <rect x="26" y="32" width="68" height="62" rx="18" fill="var(--primary-light)" stroke="var(--primary)" strokeWidth="4" />
      {/* occhi */}
      <circle cx="46" cy="60" r="9" fill="var(--primary)" />
      <circle cx="74" cy="60" r="9" fill="var(--primary)" />
      <circle cx="49" cy="57" r="3" fill="#fff" />
      <circle cx="77" cy="57" r="3" fill="#fff" />
      {/* sorriso */}
      <path d="M45 76 Q60 88 75 76" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
