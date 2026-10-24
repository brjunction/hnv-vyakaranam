// Tiny animated pictures for the game cards (CSS only).

export function ArtBattle() {
  return (
    <span className="relative block h-full w-full overflow-hidden" style={{ background: "linear-gradient(#1d2f4d, #a65d57 60%, #f0b36a)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/games/battle.png" alt="" className="ga-battle absolute bottom-0 left-1/2 h-[96%] w-auto -translate-x-1/2" />
    </span>
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

/** The emblem of each game. */
export function GameLogo({ game, size = 56 }: { game: "rama-ravana" | "setu-bandha" | "sandhi-match"; size?: number }) {
  const c = game === "rama-ravana" ? "#b3341a" : game === "setu-bandha" ? "#d9622b" : "#1f8a8a";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Game emblem" className="flex-none">
      <defs><linearGradient id={`gl-${game}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor="#0d1a16" /></linearGradient></defs>
      <circle cx="32" cy="32" r="30" fill={`url(#gl-${game})`} stroke="#e8c766" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#e8c766" strokeWidth="0.8" opacity=".7" />
      {game === "rama-ravana" && (
        <g stroke="#f6d77a" strokeWidth="2.4" fill="none" strokeLinecap="round">
          <path d="M22 14 Q10 32 22 50" />
          <line x1="22" y1="14" x2="22" y2="50" strokeWidth="1" />
          <line x1="16" y1="32" x2="50" y2="32" />
          <path d="M44 26 L52 32 L44 38" fill="#f6d77a" />
          <path d="M32 18 l2 -5 2 4 2 -4 2 5" strokeWidth="1.6" />
        </g>
      )}
      {game === "setu-bandha" && (
        <g>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={10 + i * 11} y={38 - i * 2} width="10" height="6" rx="2" fill="#a8805a" stroke="#f6d77a" strokeWidth="1" />)}
          <path d="M6 48 q6 -4 12 0 t12 0 t12 0 t12 0" stroke="#bfe3ec" strokeWidth="2" fill="none" />
          <circle cx="44" cy="22" r="6" fill="#f0b43c" /><circle cx="14" cy="26" r="2" fill="#f6d77a" />
        </g>
      )}
      {game === "sandhi-match" && (
        <g>
          <rect x="12" y="18" width="18" height="26" rx="4" fill="#f6d77a" transform="rotate(-8 21 31)" />
          <rect x="34" y="18" width="18" height="26" rx="4" fill="#fff" stroke="#f6d77a" strokeWidth="1.5" transform="rotate(8 43 31)" />
          <text x="21" y="37" fontSize="14" textAnchor="middle" fill="#0d1a16" fontFamily="serif">सं</text>
          <text x="43" y="37" fontSize="14" textAnchor="middle" fill="#0d1a16" fontFamily="serif">धि</text>
        </g>
      )}
    </svg>
  );
}
