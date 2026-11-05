// Design tokens, same as src/theme/tokens.ts. The iOS app has its own surfaces
// (blocks on a lighter page) and the system SF Pro font.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0C",
        card: "#1C1C1E",
        card2: "#2A2A2E",
        raised: "#242428",
        line: "rgba(255,255,255,0.08)",
        t1: "#FFFFFF",
        t2: "#9A9AA0",
        t3: "#888890",
        lime: "#C8FF4A",
        onLime: "#101400",
        limeSoft: "rgba(200,255,74,0.16)",
        cyan: "#3DF2EE",
        onCyan: "#06302F",
        cyanSoft: "rgba(61,242,238,0.16)",
        indigo: "#5468F0",
        danger: "#FF5A6E",
        dangerSoft: "rgba(255,90,110,0.16)",
        ok: "#4FE0A0",
        okSoft: "rgba(79,224,160,0.16)",
      },
      // iOS system font (SF Pro), never Regular: the lightest weight is Medium (500).
      // font-m500..font-m800 are kept as class names so weights read the same as in the Mini App.
      fontWeight: {
        m500: "500",
        m600: "600",
        m700: "700",
        m800: "800",
      },
      // Buttons and controls come in exactly two heights.
      height: { lg: 52, sm: 40 },
      width: { lg: 52, sm: 40 },
      borderRadius: { card: 24, tile: 18, sheet: 32 },
    },
  },
  plugins: [],
};
