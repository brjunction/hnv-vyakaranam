// Tiny animated pictures for the game cards, and each game's emblem (CSS / SVG only).
import type { GameId } from "@/lib/practice/games";

export function ArtBattle() {
  return (
    <span className="relative block h-full w-full overflow-hidden" style={{ background: "linear-gradient(#1d2f4d, #a65d57 60%, #f0b36a)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/games/battle.png" alt="" className="ga-battle absolute bottom-0 left-1/2 h-[96%] w-auto -translate-x-1/2" />
    </span>
  );
}

export function ArtDash() {
  return (
    <span className="relative block h-full w-full overflow-hidden" style={{ background: "linear-gradient(#27305e, #b9606a 58%, #f4b673)" }}>
      <span className="ga-dash-hills absolute inset-x-0 bottom-[16%] h-[36%]" />
      <span className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: "linear-gradient(#7a5236,#3a261c)" }} />
      <span className="ga-dash-road absolute inset-x-0 bottom-[8%] h-[3px]" />
      <span className="ga-dash-gate absolute bottom-[14%] right-[8%] h-[60%] w-[22%]" />
      <span className="ga-dash-rama absolute bottom-[8%] left-[10%] h-[74%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/games/rama.png" alt="" className="h-full w-auto" style={{ transform: "scaleX(-1)" }} />
      </span>
    </span>
  );
}

export function ArtForge() {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <defs><radialGradient id="ga-fg" cx=".5" cy="1" r="1"><stop offset="0" stopColor="#7a2d0f" /><stop offset="1" stopColor="#17100e" /></radialGradient></defs>
      <rect width="200" height="90" fill="url(#ga-fg)" />
      <rect x="52" y="22" width="96" height="26" rx="6" fill="#e0661c" stroke="#ffb04a" />
      <text x="72" y="42" fontSize="17" fill="#2b1208" fontFamily="serif">राम</text>
      <rect x="92" y="27" width="16" height="16" rx="3" fill="#2b1208" className="ga-pulse" />
      <text x="100" y="40" fontSize="12" textAnchor="middle" fill="#fff3d6" fontFamily="serif">ा</text>
      <text x="112" y="42" fontSize="17" fill="#2b1208" fontFamily="serif">र्जुन</text>
      <path d="M40 54 H160 L148 62 H122 L130 72 H142 V84 H58 V72 H70 L78 62 H52Z" fill="#3a3f4a" stroke="#1d2027" />
      <g fill="#ffd166" className="ga-sparks">{[[100, 20], [86, 14], [116, 14], [96, 8], [108, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" style={{ animationDelay: `${i * 0.18}s` }} />)}</g>
    </svg>
  );
}

export function ArtGrid() {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <rect width="200" height="90" fill="#6a2c14" />
      {Array.from({ length: 4 }).flatMap((_, r) => Array.from({ length: 3 }).map((__, c) => (
        <rect key={`${r}${c}`} x={46 + c * 40} y={8 + r * 20} width="36" height="16" rx="4" fill={(r + c) % 3 === 0 ? "#fdf3d8" : "rgba(0,0,0,.25)"} stroke="#e8c766" strokeDasharray={(r + c) % 3 === 0 ? "0" : "3 2"} className={(r + c) % 3 === 0 ? "ga-fill" : ""} style={{ animationDelay: `${(r * 3 + c) * 0.25}s` }} />
      )))}
      {[0, 1, 2, 3].map((r) => <rect key={r} x="8" y={8 + r * 20} width="34" height="16" rx="4" fill="rgba(0,0,0,.3)" />)}
      <text x="150" y="24" fontSize="9" fill="#fff" fontFamily="sans-serif" opacity=".0">.</text>
    </svg>
  );
}

export function ArtSorter() {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <rect width="200" height="90" fill="#12303a" />
      <rect y="26" width="200" height="9" fill="#2a2f3b" />
      <g className="ga-crate"><rect x="14" y="10" width="46" height="20" rx="4" fill="#d7a05c" stroke="#7a4d1d" strokeWidth="2" /><text x="37" y="24" fontSize="9" textAnchor="middle" fill="#2a1608" fontFamily="serif">अ + इ</text></g>
      {["#1f8a8a", "#d9622b", "#4b5fc7"].map((c, i) => <path key={i} d={`M${16 + i * 62} 52 H${62 + i * 62} L${58 + i * 62} 84 H${20 + i * 62}Z`} fill={c} stroke="#fff" strokeOpacity=".4" />)}
      {[1, 2, 3].map((n, i) => <text key={n} x={39 + i * 62} y="74" fontSize="16" textAnchor="middle" fill="#fff" fontFamily="sans-serif">{n}</text>)}
    </svg>
  );
}

export function ArtTiles({ label, tint }: { label: string; tint: string }) {
  return (
    <svg viewBox="0 0 200 90" className="block h-full w-full" aria-hidden>
      <rect width="200" height="90" fill={tint} />
      {[0, 1, 2].map((i) => <rect key={i} x={22 + i * 56} y={22 + (i % 2) * 8} width="48" height="40" rx="8" fill="#f6d77a" opacity={0.9 - i * 0.18} />)}
      <text x="100" y="52" fontSize="20" textAnchor="middle" fill="#fff" fontFamily="serif">{label}</text>
    </svg>
  );
}

export const ART: Record<GameId, () => React.ReactNode> = {
  "rama-ravana": () => <ArtBattle />,
  "lanka-dash": () => <ArtDash />,
  "sandhi-forge": () => <ArtForge />,
  "nama-grid": () => <ArtGrid />,
  "rule-sorter": () => <ArtSorter />,
  "case-blitz": () => <ArtTiles label="कृष्णाय" tint="#2e1065" />,
  "varna-order": () => <ArtTiles label="अ आ इ ई" tint="#042f2e" />,
  "sutra-order": () => <ArtTiles label="१ → २ → ३" tint="#3b0764" />,
};

/** The emblem of each game. */
export function GameLogo({ game, size = 56 }: { game: GameId; size?: number }) {
  const c: Record<GameId, string> = { "rama-ravana": "#b3341a", "lanka-dash": "#d9622b", "sandhi-forge": "#c2410c", "nama-grid": "#a8541e", "rule-sorter": "#1f8a8a", "case-blitz": "#7c3aed", "varna-order": "#0f766e", "sutra-order": "#9333ea" };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Game emblem" className="flex-none">
      <defs><linearGradient id={`gl-${game}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c[game]} /><stop offset="1" stopColor="#0d1a16" /></linearGradient></defs>
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
      {game === "lanka-dash" && (
        <g fill="none" stroke="#f6d77a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="36" cy="16" r="4" fill="#f6d77a" />
          <path d="M34 22 L28 34 L20 38 M28 34 L36 40 L34 50 M31 26 L42 26 L48 20" />
          <path d="M8 30 h8 M6 38 h10 M10 46 h8" strokeWidth="1.6" opacity=".8" />
        </g>
      )}
      {game === "sandhi-forge" && (
        <g>
          <path d="M12 38 H52 L47 44 H40 L43 50 H46 V54 H18 V50 H21 L24 44 H17Z" fill="#cfd6e2" stroke="#f6d77a" strokeWidth="1.2" />
          <g transform="rotate(-30 40 20)"><rect x="30" y="12" width="22" height="9" rx="2" fill="#f6d77a" /><rect x="38" y="20" width="4" height="16" fill="#a8805a" /></g>
          <circle cx="22" cy="30" r="1.6" fill="#ffd166" /><circle cx="28" cy="26" r="1.2" fill="#ffd166" /><circle cx="16" cy="26" r="1.2" fill="#ffd166" />
        </g>
      )}
      {game === "nama-grid" && (
        <g stroke="#f6d77a" strokeWidth="1.6" fill="rgba(246,215,122,.18)">
          {[0, 1, 2].flatMap((r) => [0, 1, 2].map((k) => <rect key={`${r}${k}`} x={14 + k * 12} y={14 + r * 12} width="10" height="10" rx="2" fill={(r + k) % 2 ? "rgba(246,215,122,.18)" : "#f6d77a"} />))}
        </g>
      )}
      {(game === "case-blitz" || game === "varna-order" || game === "sutra-order") && (
        <text x="32" y="42" fontSize="22" textAnchor="middle" fill="#f6d77a" fontFamily="serif">{game === "case-blitz" ? "विभ" : game === "varna-order" ? "अ-ह" : "१२३"}</text>
      )}
      {game === "rule-sorter" && (
        <g>
          <rect x="12" y="16" width="40" height="8" fill="#cfd6e2" opacity=".6" />
          <rect x="22" y="9" width="18" height="12" rx="2" fill="#f6d77a" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${12 + i * 14} 36 h12 l-2 14 h-8z`} fill="none" stroke="#f6d77a" strokeWidth="1.8" />)}
        </g>
      )}
    </svg>
  );
}
