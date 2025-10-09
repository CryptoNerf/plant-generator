/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Comic Sans MS"', 'cursive', 'sans-serif'],
      },
    },
  },
  plugins: [],
}