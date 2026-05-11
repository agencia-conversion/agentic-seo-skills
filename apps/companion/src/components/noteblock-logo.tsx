interface NoteblockLogoProps {
  size?: number;
  className?: string;
}

export function NoteblockLogo({ size = 20, className }: NoteblockLogoProps) {
  return (
    <span
      role="img"
      aria-label="SEO Brain"
      className={className}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      🧠
    </span>
  );
}
