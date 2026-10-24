// An animated character made from the owner's picture. The picture is drawn
// twice — an upper part (head, arms, bow) and a lower part (legs) — cut at the
// waist, so the two halves can move on their own: the legs swing in a stride
// while the body rides over them. CSS only (see ".ac" in globals.css).

export type ActorState = "idle" | "run" | "walk" | "shoot" | "roar" | "jump" | "stumble";

export default function Actor({
  src,
  alt,
  ratio,
  state = "idle",
  cut = 58,
  flip = false,
  speed = 0.5,
  className = "",
  style,
}: {
  src: string;
  alt: string;
  /** width / height of the picture */
  ratio: number;
  state?: ActorState;
  /** where the picture is cut into upper and lower, in % from the top */
  cut?: number;
  flip?: boolean;
  /** seconds per stride */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const vars = { "--cut": `${cut}%`, "--spd": `${speed}s`, aspectRatio: String(ratio), ...style } as React.CSSProperties;
  return (
    <div className={`ac ac-${state} ${className}`} style={vars} role="img" aria-label={alt}>
      <div className="ac-in" style={flip ? { transform: "scaleX(-1)" } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ac-low" src={src} alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ac-up" src={src} alt="" draggable={false} />
      </div>
    </div>
  );
}

export const RAMA = { src: "/games/rama.png", ratio: 268 / 342 };
export const RAVANA = { src: "/games/ravana.png", ratio: 338 / 462 };
