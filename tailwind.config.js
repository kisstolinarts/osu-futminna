/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 18px 45px -18px rgb(76 29 149 / 0.25)',
      },
    },
  },
  plugins: [],
};
