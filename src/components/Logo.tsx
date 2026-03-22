interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { fontSize: 18, height: 24 },
  md: { fontSize: 22, height: 28 },
  lg: { fontSize: 40, height: 48 },
};

export function Logo({ size = "md", className }: LogoProps) {
  const { fontSize, height } = sizes[size];

  return (
    <svg
      height={height}
      viewBox={`0 0 ${fontSize * 5.2} ${height}`}
      className={className}
      aria-label="ColdCraft"
      role="img"
    >
      <text
        y={height * 0.78}
        style={{
          fontFamily:
            "var(--font-instrument-serif), 'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontSize,
          fontWeight: 400,
        }}
        fill="currentColor"
        letterSpacing={-0.5}
      >
        Cold
      </text>
      <text
        x={fontSize * 2.05}
        y={height * 0.78}
        style={{
          fontFamily:
            "var(--font-satoshi), 'General Sans', system-ui, sans-serif",
          fontSize,
          fontWeight: 700,
        }}
        fill="#3B82F6"
        letterSpacing={-1}
      >
        Craft
      </text>
    </svg>
  );
}
