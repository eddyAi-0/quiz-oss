// Set di icone SVG lineari. Usano currentColor, così seguono il colore del
// contenitore (nav attiva/inattiva, tema chiaro/scuro) senza CSS extra.
function Svg({ size = 24, className = '', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconHome(p) {
  return (
    <Svg {...p}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.5" />
      <path d="M9.5 20v-5h5v5" />
    </Svg>
  )
}

export function IconPratica(p) {
  return (
    <Svg {...p}>
      <path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v12A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 17.5 5H16" />
      <rect x="9" y="3" width="6" height="3.5" rx="1.2" />
      <path d="m8.5 13 2 2 4-4.5" />
    </Svg>
  )
}

export function IconOrale(p) {
  return (
    <Svg {...p}>
      <path d="M12 3a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 12 3z" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v3" />
      <path d="M9 20h6" />
    </Svg>
  )
}

export function IconSimulazione(p) {
  return (
    <Svg {...p}>
      <path d="M9.5 2.5h5" />
      <path d="M12 2.5V6" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 14V9.5" />
      <path d="M18.5 7.5 20 6" />
    </Svg>
  )
}

export function IconProgressi(p) {
  return (
    <Svg {...p}>
      <path d="M4 4v16h16" />
      <path d="M8 20v-5" />
      <path d="M13 20v-9" />
      <path d="M18 20v-6" />
    </Svg>
  )
}

export function IconTutor(p) {
  return (
    <Svg {...p}>
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3v-3H6a2 2 0 0 1-2-2z" />
      <circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}
