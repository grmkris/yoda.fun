interface OgBackgroundProps {
  children: React.ReactNode;
}

// Yoda.fun brand colors (oklch converted to hex for Satori compatibility)
const COLORS = {
  // Deep cosmic purple/blue background
  bgDark: "#0f0a1a",
  // Nebula purple
  nebulaPurple: "#6b21a8",
  // Nebula blue
  nebulaBlue: "#3b82f6",
  // Primary purple
  primary: "#8b5cf6",
  // Yes green (used for accents)
  yesGreen: "#10b981",
  // Text light
  textLight: "#f8fafc",
  // Text muted
  textMuted: "#94a3b8",
} as const;

/**
 * Cosmic gradient background for OG images
 * Simple linear gradient (Satori compatible)
 */
export function OgBackground({ children }: OgBackgroundProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "60px 80px",
        background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, #1e1b4b 50%, ${COLORS.bgDark} 100%)`,
      }}
    >
      {children}
    </div>
  );
}

export { COLORS };
