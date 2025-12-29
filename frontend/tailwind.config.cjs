/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx,html}',
    '!./public/**'
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
}
