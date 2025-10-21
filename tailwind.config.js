/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Comic Sans MS"', '"Comic Sans"', '"Chalkboard SE"', '"Bradley Hand"', 'cursive'],
      },
    },
  },
  plugins: [],
}