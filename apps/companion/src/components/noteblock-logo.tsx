interface NoteblockLogoProps {
  size?: number;
  className?: string;
}

export function NoteblockLogo({ size = 20, className }: NoteblockLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Noteblock logo"
    >
      <path
        d="M4 4 H22 L28 10 V28 H4 Z"
        fill="currentColor"
      />
      <path
        d="M22 4 V10 H28"
        stroke="var(--notion-bg, #fff)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10 22 V14 L18 22 V14"
        stroke="var(--notion-bg, #fff)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
