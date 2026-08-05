// Custom line-art face icon for the 3 chore validation outcomes — per "Calm
// Chore Creation.txt": "drawn in the app's own line-art style - black
// stroke, cream fill, matching the mask figure and badges elsewhere."
// Always meant to sit next to the existing text label, never replace it
// (mobile has no hover to reveal a hidden label), so this renders
// aria-hidden and leaves the accessible name to whatever label sits beside
// it in each caller.
export type FaceStatus = "verified_complete" | "verified_partially_complete" | "incomplete";

const MOUTHS: Record<FaceStatus, string> = {
  verified_complete: "M 9 19 Q 16 25 23 19",
  verified_partially_complete: "M 9 20 L 23 20",
  incomplete: "M 9 22 Q 16 16 23 22",
};

export default function FaceIcon({
  status,
  size = 20,
  className,
}: {
  status: FaceStatus;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="13" fill="#F4F1EA" stroke="#1F1F1F" strokeWidth="2" />
      <circle cx="11" cy="13" r="1.6" fill="#1F1F1F" />
      <circle cx="21" cy="13" r="1.6" fill="#1F1F1F" />
      <path d={MOUTHS[status]} fill="none" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
