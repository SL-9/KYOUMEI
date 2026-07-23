type KyoumeiMarkProps = {
  className?: string
}

export default function KyoumeiMark({ className = 'h-10 w-10' }: KyoumeiMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="響鳴 Kyoumei"
    >
      <defs>
        <linearGradient id="kyoumei-mark-gradient" x1="10" y1="8" x2="54" y2="56">
          <stop stopColor="#A78BFA" />
          <stop offset=".48" stopColor="#6D28D9" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <filter id="kyoumei-mark-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="64" height="64" rx="18" fill="#15112B" />
      <rect x="1" y="1" width="62" height="62" rx="17" fill="none" stroke="#A78BFA" strokeOpacity=".28" />
      <g
        fill="none"
        stroke="url(#kyoumei-mark-gradient)"
        strokeLinecap="round"
        filter="url(#kyoumei-mark-glow)"
      >
        <path d="M12 32c5.5 0 5.5-12 11-12s5.5 24 11 24 5.5-24 11-24 5.5 12 11 12" strokeWidth="4" />
        <path d="M16 42c4 0 4-5 8-5s4 10 8 10 4-10 8-10 4 5 8 5" strokeWidth="2" opacity=".46" />
      </g>
      <circle cx="32" cy="14" r="2" fill="#E9D5FF" />
    </svg>
  )
}
