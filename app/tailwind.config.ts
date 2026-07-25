import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fixed calm-green parent theme
        calm: {
          bg: "#F4F1EA",
          green: "#2E5B4C",
          greenLight: "#DDEAE4",
          text: "#2B2B28",
        },
        // Curated child accent palette (background tint / accent ring)
        child: {
          blueBg: "#D2E3F5",
          blueAccent: "#9CC0E8",
          redBg: "#F5DCDC",
          redAccent: "#E3A6A6",
          purpleBg: "#E6DCF5",
          purpleAccent: "#C7A6E3",
          orangeBg: "#F5E3D2",
          orangeAccent: "#E3B686",
          goldBg: "#F5EFD2",
          goldAccent: "#E3D08F",
          tealBg: "#D2F0EC",
          tealAccent: "#8FD9CC",
        },
      },
    },
  },
  plugins: [],
};
export default config;
