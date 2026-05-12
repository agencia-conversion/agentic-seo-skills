interface NoteblockLogoProps {
  size?: number;
  className?: string;
}

export function NoteblockLogo({ size = 20, className }: NoteblockLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      aria-label="agentic seo"
      className={className}
      role="img"
    >
      <line x1="28" y1="6" x2="28" y2="50" />
      <line x1="6" y1="28" x2="50" y2="28" />
      <line x1="13" y1="13" x2="43" y2="43" />
      <line x1="43" y1="13" x2="13" y2="43" />
    </svg>
  );
}
