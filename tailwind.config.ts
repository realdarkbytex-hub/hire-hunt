import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0E0B1D",
        cardBg: "#2A1E4D",
        cardBorder: "#3A3A52",
        primaryAccent: "#5A3B8C",
        accentGlow: "#8B7CC7",
        textPrimary: "#FFFFFF",
        textSecondary: "#C9C2E3",
        borderMuted: "#3A3A52",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
