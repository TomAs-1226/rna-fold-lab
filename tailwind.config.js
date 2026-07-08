/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1220",
        surface: "#111C31",
        surface2: "#16233D",
        line: "#22304B",
        ink: "#E7EEF7",
        mut: "#93A4BE",
        teal: "#2DD4BF",
        tealdim: "#14B8A6",
        indigo: "#818CF8",
        amber: "#F5B056",
        danger: "#F87171",
        good: "#34D399",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,0.15), 0 8px 30px rgba(0,0,0,0.35)",
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { rise: "rise 0.4s cubic-bezier(0.16,1,0.3,1) both" },
    },
  },
  plugins: [],
};
