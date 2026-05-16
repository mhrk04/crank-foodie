import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201c",
        paper: "#f7f5ef",
        leaf: "#1f7a4d",
        mint: "#dff4e7",
        tomato: "#d94738",
        amber: "#f3b23c",
        ocean: "#2f6f8f",
        steel: "#e0e7e9"
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(31, 122, 77, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;

