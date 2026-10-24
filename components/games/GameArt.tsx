// Tiny animated pictures for the game cards (CSS only).

export function ArtBattle() {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <rect width="200" height="90" fill="#274b6e" />
      <rect y="58" width="200" height="32" fill="#173f55" />
      <circle cx="100" cy="52" r="22" fill="#e9a76a" opacity=".5" className="rr-sun" />
      <circle cx="30" cy="36" r="8" fill="#4a7cc4" /><rect x="26" y="44" width="8" height="20" fill="#3e6fb8" />
      <circle cx="170" cy="32" r="10" fill="#7a2a1c" /><rect x="163" y="42" width="14" height="22" fill="#7a2a1c" />
      <g className="ga-arrow-l"><line x1="40" y1="46" x2="66" y2="46" stroke="#f6d77a" strokeWidth="2.5" /><path d="M66 42 L74 46 L66 50 Z" fill="#f6d77a" /></g>
      <g className="ga-arrow-r"><line x1="160" y1="46" x2="134" y2="46" stroke="#ff9a4a" strokeWidth="2.5" /><path d="M134 42 L126 46 L134 50 Z" fill="#ff9a4a" /></g>
    </svg>
  );
}

export function ArtMatch() {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <rect width="200" height="90" fill="#15241f" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className="ga-flip" style={{ animationDelay: `${i * 0.5}s`, transformOrigin: `${34 + i * 44}px 45px` }}>
          <rect x={14 + i * 44} y="20" width="40" height="50" rx="7" fill={i % 2 ? "#c9a227" : "#1f8a8a"} />
          <text x={34 + i * 44} y="52" textAnchor="middle" fontSize="18" fill="#fff" fontFamily="serif">{["ॐ", "सं", "ॐ", "धि"][i]}</text>
        </g>
      ))}
    </svg>
  );
}

export function ArtBridge() {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <rect width="200" height="90" fill="#e9a76a" />
      <rect y="58" width="200" height="32" fill="#2f8aa0" />
      <circle cx="150" cy="40" r="14" fill="#fff3c4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} className="ga-stone" style={{ animationDelay: `${i * 0.45}s` }} x={22 + i * 32} y="56" width="26" height="9" rx="4" fill="#a8805a" stroke="#6b4f2c" />
      ))}
      <circle cx="22" cy="44" r="7" fill="#f0b43c" /><rect x="17" y="50" width="10" height="12" fill="#f0b43c" />
    </svg>
  );
}
