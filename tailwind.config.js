/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E11D48',
        accent: '#FB3B62',
        background: '#080808',
        surface: '#111111',
        'surface-2': '#1A1A1A',
        text: '#FAFAFA',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 4px 24px rgba(225,29,72,0.25)',
        card: '0 8px 32px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
