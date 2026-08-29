import { nextui } from "@nextui-org/react";

// Base logo blue (#0000FF) — primary palette for Tailwind + NextUI
const baseBlue = {
  DEFAULT: "#0000FF",
  50: "#e6e6ff",
  100: "#ccccff",
  200: "#9999ff",
  300: "#6666ff",
  400: "#3333ff",
  500: "#0000FF",
  600: "#0000cc",
  700: "#000099",
  800: "#000066",
  900: "#000033",
  950: "#00001a",
  foreground: "#ffffff",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        athletics: ["Athletics", "sans-serif"],
      },
      colors: {
        primary: baseBlue,
        purply: {
          DEFAULT: "#7b61ff",
          50: "#f3f2ff",
          100: "#e9e8ff",
          200: "#d5d4ff",
          300: "#b7b1ff",
          400: "#9385ff",
          500: "#7b61ff",
          600: "#5d30f7",
          700: "#4f1ee3",
          800: "#4218bf",
          900: "#37169c",
          950: "#200b6a",
        },
        "oasis-blue": "#2127FF",
        "light": "#F2F2F2",
        "light-white": "#F9F9FA"
      },
      borderRadius: {
        "4xl": "32px",
      },
    },
  },
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: baseBlue,
          },
        },
        dark: {
          colors: {
            primary: {
              ...baseBlue,
              foreground: "#ffffff",
            },
          },
        },
      },
    }),
  ],
  darkMode: "class",
};
