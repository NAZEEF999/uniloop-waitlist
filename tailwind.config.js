// NOTE: Tailwind v4 reads design tokens from the @theme block in src/index.css.
// This file is kept only for editor tooling and mirrors the brand colors.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: '#102A43', green: '#71E6A3', softWhite: '#F5F7FA' },
    },
  },
}
