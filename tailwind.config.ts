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
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        surface: "var(--color-surface)",
        "surface-strong": "var(--color-surface-strong)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        success: "var(--color-success)",
      },
      fontFamily: {
        sans: ["var(--font-body-family)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading-family)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.22)",
        premium: "0 20px 50px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
