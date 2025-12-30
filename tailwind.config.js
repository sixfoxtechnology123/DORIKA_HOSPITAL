/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dorika: {
          blue: "#0B4EA2",
          blueLight: "#EAF2FF",
          orange: "#F36C21",
          green: "#2BB673",
        },
      },
    },
  },
  plugins: [],
}
