import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#05070A",
        primary: "#0B60B0",
        accent: "#00D1FF",
      },
      backgroundImage: {
        "neon-gradient": "linear-gradient(135deg, #0B60B0 0%, #00D1FF 100%)",
      },
      boxShadow: {
        glow: "0 0 25px rgba(0, 209, 255, 0.35)",
        "glow-lg": "0 0 60px rgba(0, 209, 255, 0.25)",
      },
      animation: {
        marquee: "marquee 18s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
