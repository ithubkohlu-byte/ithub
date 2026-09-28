import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05070d",
          900: "#080c17",
          850: "#0c1120",
          800: "#111827",
          700: "#1b2436",
        },
        neon: {
          cyan:   "#22d3ee",
          blue:   "#3b82f6",
          violet: "#7c6cf6",
          green:  "#10b981",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body:    ["var(--font-body)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "neon-line":
          "linear-gradient(90deg, #22d3ee 0%, #3b82f6 50%, #7c6cf6 100%)",
        "neon-line-135":
          "linear-gradient(135deg, #22d3ee 0%, #3b82f6 60%, #7c6cf6 100%)",
        "cyber-grid":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.13), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.10), transparent 55%)",
      },
      boxShadow: {
        glow:      "0 0 0 1px rgba(34,211,238,0.15), 0 8px 30px -8px rgba(34,211,238,0.25)",
        "glow-lg": "0 0 0 1px rgba(34,211,238,0.25), 0 0 50px -10px rgba(34,211,238,0.4)",
        neon:      "0 0 28px -6px rgba(34,211,238,0.6)",
      },
      keyframes: {
        ticker:   { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-glow": { "0%,100%": { opacity: "0.4" }, "50%": { opacity: "1" } },
        "rotate-ring": { to: { transform: "rotate(360deg)" } },
        "scan": { "0%": { top: "-2px" }, "100%": { top: "100%" } },
        "data-stream": { "0%": { transform: "translateY(0)", opacity: "1" }, "100%": { transform: "translateY(-30px)", opacity: "0" } },
        "float-y": { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
        "border-glow": { "0%,100%": { boxShadow: "0 0 0 1px rgba(34,211,238,0.15)" }, "50%": { boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 0 30px -4px rgba(34,211,238,0.3)" } },
      },
      animation: {
        ticker:        "ticker 22s linear infinite",
        "fade-up":     "fade-up 0.6s ease-out both",
        "pulse-glow":  "pulse-glow 2s ease-in-out infinite",
        "rotate-ring": "rotate-ring 8s linear infinite",
        "scan":        "scan 4s linear infinite",
        "float-y":     "float-y 4s ease-in-out infinite",
        "border-glow": "border-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
