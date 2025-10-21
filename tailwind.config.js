
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['ui-sans-serif','system-ui'],
        body: ['ui-sans-serif','system-ui'],
      }
    },
  },
  plugins: [],
}
