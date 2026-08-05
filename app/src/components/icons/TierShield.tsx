// Custom line-art tier badge — "Child Login Options.txt": "Each tier differs
// based on the colour of the shield depicting the tier and the weapons on
// the shield... The levels within each tier are represented by the number
// of such weapons on the shield." Replaces the generic 🛡️ emoji used
// everywhere tier is shown with an actual shield graphic, coloured per tier
// and carrying `level` copies of that tier's specific weapon glyph — same
// black-stroke / cream-fill line-art style as FaceIcon.tsx.
const STROKE = "#1F1F1F";

export type TierWeapon =
  | "Wooden Spoon"
  | "Fork"
  | "Club"
  | "Knife"
  | "Sword"
  | "Axe"
  | "Morningstar"
  | "Flail"
  | "Lance"
  | "Spear"
  | "Longsword"
  | "Warhammer";

// Progressively "more royal" shield fill per tier — same ordering as
// tiers.ts's TIER_STYLE, translated to flat hex fills since this renders as
// raw SVG rather than Tailwind classes.
const SHIELD_FILL: Record<string, string> = {
  Rook: "#E7E2D9",
  Warrior: "#F0C9A0",
  Hero: "#F3D98B",
  Champion: "#C9DE8B",
  Icon: "#8FD9CC",
  Legend: "#9CC7EE",
  Master: "#8FAEEE",
  Sovereign: "#A79CEE",
  Titan: "#C39CEE",
  Oracle: "#D49CEE",
  Avatar: "#EE9CD9",
  Demigod: "#F2D24A",
};

// One shaft shared by every weapon (local coords: shaft runs from the hilt
// at the bottom to the base of the head near the top); only the "head" at
// the top differs per weapon, keeping the 12 glyphs visually related as a
// weapon family rather than 12 unrelated icons.
function Shaft({ short = false }: { short?: boolean }) {
  return (
    <line
      x1="0"
      y1={short ? "16" : "16"}
      x2="0"
      y2={short ? "2" : "-6"}
      stroke={STROKE}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

function WeaponGlyph({ weapon }: { weapon: TierWeapon }) {
  switch (weapon) {
    case "Wooden Spoon":
      return (
        <>
          <Shaft />
          <ellipse cx="0" cy="-10" rx="4.5" ry="6" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" />
        </>
      );
    case "Fork":
      return (
        <>
          <Shaft />
          <line x1="-4" y1="-6" x2="-4" y2="-15" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="-6" x2="0" y2="-16" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="-6" x2="4" y2="-15" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-4" y1="-6" x2="4" y2="-6" stroke={STROKE} strokeWidth="1.5" />
        </>
      );
    case "Club":
      return (
        <>
          <Shaft />
          <rect x="-4.5" y="-16" width="9" height="10" rx="4" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" />
        </>
      );
    case "Knife":
      return (
        <>
          <line x1="0" y1="16" x2="0" y2="4" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          <polygon points="-3,4 3,4 0,-14" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );
    case "Sword":
      return (
        <>
          <Shaft />
          <line x1="-6" y1="-6" x2="6" y2="-6" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          <polygon points="-2.5,-6 2.5,-6 0,-18" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );
    case "Axe":
      return (
        <>
          <Shaft />
          <path
            d="M 0 -6 C 6 -6 9 -10 6 -16 C 3 -13 0 -12 0 -9 Z"
            fill="#F4F1EA"
            stroke={STROKE}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      );
    case "Morningstar":
      return (
        <>
          <Shaft />
          <circle cx="0" cy="-11" r="4.5" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" />
          <line x1="0" y1="-15.5" x2="0" y2="-18.5" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="4.2" y1="-13" x2="6.8" y2="-15" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="-4.2" y1="-13" x2="-6.8" y2="-15" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="4.2" y1="-9" x2="6.8" y2="-7" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="-4.2" y1="-9" x2="-6.8" y2="-7" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case "Flail":
      return (
        <>
          <line x1="0" y1="16" x2="0" y2="4" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          <path d="M 0 4 Q 3 -2 1.5 -8" fill="none" stroke={STROKE} strokeWidth="1.2" />
          <circle cx="1" cy="-11" r="3.5" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" />
        </>
      );
    case "Lance":
      return (
        <>
          <line x1="0" y1="16" x2="0" y2="-14" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" />
          <polygon points="-2,-14 2,-14 0,-19" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.2" strokeLinejoin="round" />
        </>
      );
    case "Spear":
      return (
        <>
          <Shaft />
          <polygon points="-2.5,-6 2.5,-6 0,-11 2.5,-16 -2.5,-16 0,-11" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round" />
        </>
      );
    case "Longsword":
      return (
        <>
          <line x1="0" y1="16" x2="0" y2="-2" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          <line x1="-6" y1="-2" x2="6" y2="-2" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />
          <polygon points="-2.5,-2 2.5,-2 0,-20" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );
    case "Warhammer":
      return (
        <>
          <Shaft />
          <rect x="-6" y="-16" width="12" height="7" rx="1.5" fill="#F4F1EA" stroke={STROKE} strokeWidth="1.5" />
        </>
      );
    default:
      return null;
  }
}

// Fixed layout per level rather than dynamic measurement — level only ever
// takes the values 1, 2 or 3, so a small lookup of (x offset, scale) per
// slot is simpler and more predictable than measuring glyph bounds at
// runtime.
const LAYOUTS: Record<1 | 2 | 3, { x: number; scale: number }[]> = {
  1: [{ x: 0, scale: 1 }],
  2: [
    { x: -9, scale: 0.82 },
    { x: 9, scale: 0.82 },
  ],
  3: [
    { x: -13, scale: 0.68 },
    { x: 0, scale: 0.68 },
    { x: 13, scale: 0.68 },
  ],
};

export default function TierShield({
  tierName,
  level,
  weapon,
  size = 32,
  className,
}: {
  tierName: string;
  level: 1 | 2 | 3;
  weapon: TierWeapon | string;
  size?: number;
  className?: string;
}) {
  const fill = SHIELD_FILL[tierName] ?? SHIELD_FILL.Rook;
  const layout = LAYOUTS[level] ?? LAYOUTS[1];

  return (
    <svg
      width={size}
      height={size * (56 / 48)}
      viewBox="0 0 48 56"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 4 H44 V22 C44 36 34 47 24 52 C14 47 4 36 4 22 Z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {layout.map((slot, i) => (
        <g key={i} transform={`translate(${24 + slot.x}, 28) scale(${slot.scale})`}>
          <WeaponGlyph weapon={weapon as TierWeapon} />
        </g>
      ))}
    </svg>
  );
}
