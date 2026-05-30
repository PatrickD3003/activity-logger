import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        panel: "#151922",
        panelSoft: "#1f2530",
        ink: "#f8fafc",
        muted: "#94a3b8",
        line: "#2d3441",
        action: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#38bdf8"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,197,94,.35), 0 18px 40px rgba(0,0,0,.25)"
      }
    }
  },
  plugins: []
};

export default config;
