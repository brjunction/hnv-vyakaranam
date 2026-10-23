// The living sky behind the home hero: a breathing sun, clouds drifting
// across, and the letters of the alphabet rising softly. CSS only.

const CLOUDS = [
  { top: "8%", w: 260, dur: 70, delay: -10 },
  { top: "28%", w: 180, dur: 55, delay: -40 },
  { top: "52%", w: 320, dur: 90, delay: -65 },
  { top: "70%", w: 150, dur: 48, delay: -5 },
];
const GLYPHS = "अआइईउऊऋएओकखगघचजटडतदनपबमयरलवशसह".split("");

function Cloud({ w }: { w: number }) {
  return (
    <svg width={w} height={w * 0.42} viewBox="0 0 120 50" fill="currentColor" aria-hidden>
      <path d="M20 44c-9 0-16-6-16-13s6-12 14-12c2-9 10-15 20-15 9 0 16 5 19 12 2-1 5-2 8-2 9 0 16 6 17 14 1 0 2-1 4-1 8 0 14 5 14 11s-6 6-14 6H20z" />
    </svg>
  );
}

export default function HeroSky() {
  return (
    <div className="hero-sky" aria-hidden>
      <div className="sun" />
      {CLOUDS.map((c, i) => (
        <div key={i} className="cloud" style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <Cloud w={c.w} />
        </div>
      ))}
      {GLYPHS.slice(0, 14).map((g, i) => (
        <span
          key={i}
          className="glyph"
          style={{ left: `${(i * 7.3 + 3) % 96}%`, fontSize: `${1 + ((i * 37) % 5) * 0.35}rem`, animationDuration: `${14 + ((i * 13) % 9)}s`, animationDelay: `${-((i * 5.7) % 18)}s` }}
        >
          {GLYPHS[(i * 11) % GLYPHS.length]}
        </span>
      ))}
    </div>
  );
}
