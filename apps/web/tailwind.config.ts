import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep-space surfaces
        void: "#04050c",
        abyss: "#070a16",
        panel: "#0d1120",
        panel2: "#131a2e",
        edge: "rgba(140,170,255,0.10)",
        // Neon accents
        cyan: {
          DEFAULT: "#2dd4ff",
          soft: "#7ee7ff",
        },
        violet: {
          DEFAULT: "#7c5cff",
          soft: "#a892ff",
        },
        magenta: "#ff5cf0",
        lime: "#54f7c0",
        brand: {
          DEFAULT: "#7c5cff",
          dark: "#5b3df6",
          light: "#a892ff",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        raised:
          "10px 10px 28px rgba(0,0,0,0.6), -8px -8px 22px rgba(120,150,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)",
        "raised-sm":
          "5px 5px 14px rgba(0,0,0,0.55), -4px -4px 12px rgba(120,150,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
        inset:
          "inset 6px 6px 16px rgba(0,0,0,0.7), inset -4px -4px 12px rgba(120,150,255,0.05)",
        "glow-cyan": "0 0 24px rgba(45,212,255,0.45)",
        "glow-violet": "0 0 24px rgba(124,92,255,0.5)",
        "glow-lime": "0 0 22px rgba(84,247,192,0.45)",
      },
      backgroundImage: {
        "grid-glow":
          "linear-gradient(rgba(124,92,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.06) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(1200px 600px at 50% -10%, rgba(124,92,255,0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(45,212,255,0.12), transparent 55%)",
        holo:
          "linear-gradient(120deg, #2dd4ff 0%, #7c5cff 45%, #ff5cf0 100%)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        scan: "scan 3.5s linear infinite",
        shimmer: "shimmer 6s linear infinite",
        spinSlow: "spinSlow 18s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
