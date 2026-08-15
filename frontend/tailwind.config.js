/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f7",
          100: "#d9ebea",
          200: "#b3d7d5",
          300: "#82bcb9",
          400: "#4f9c98",
          500: "#2f7f7c",
          600: "#1f6360",
          700: "#194f4d",
          800: "#153e3d",
          900: "#0f2c2b",
          950: "#081918",
        },
        accent: {
          50: "#fdf8ed",
          100: "#faedc7",
          200: "#f5d888",
          300: "#efc158",
          400: "#e6a52e",
          500: "#d3891e",
          600: "#b06817",
          700: "#8c4d17",
          800: "#733e19",
          900: "#5f3419",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
