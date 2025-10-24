module.exports = {
  content: [
    '../**/*.{html,js}',
    '!../tailwind/**.*'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
}
