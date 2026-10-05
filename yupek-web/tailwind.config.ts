import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { cream: "#F6F1E7", ivory: "#FBF8F2", sand: "#D9CBB0", brown: "#2B1D14", charcoal: "#222222", burgundy: "#6E1F2B", olive: "#5C5E3A", gold: "#A88B4A" },
    fontFamily: { serif: ["var(--font-serif)", "Georgia", "serif"], sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
  } },
  plugins: [],
};
export default config;
