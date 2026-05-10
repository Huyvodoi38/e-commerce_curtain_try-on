import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bảng màu chủ đạo: tone vải linen ấm
        brand: {
          50: "#faf7f2",
          100: "#f1e9dc",
          200: "#e2d2b8",
          300: "#cdb38a",
          400: "#b89561",
          500: "#9d7a45",
          600: "#7e6037",
          700: "#5e482a",
          800: "#3f301c",
          900: "#1f180e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
