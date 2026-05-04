import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        helix: {
          50: "#eef9ff",
          100: "#d9f1ff",
          200: "#bce6ff",
          300: "#8ed6ff",
          400: "#58bdff",
          500: "#319eff",
          600: "#1b7ff5",
          700: "#1665db",
          800: "#1854b0",
          900: "#1a4a8a",
        },
        bio: {
          mint: "#7df0c2",
          teal: "#22d3c5",
          violet: "#8b5cf6",
          rose: "#f472b6",
        },
      },
      backgroundImage: {
        "bio-gradient":
          "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0e7490 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(236,254,255,0.7) 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(34, 211, 197, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
