/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    darkMode: 'class',
    extend: {
      colors: {
        bt: {
          bg: '#020617',
          node: '#1e293b',
          panel: '#0f172a',
        },
      },
      boxShadow: {
        node: '0 10px 30px rgba(2, 6, 23, 0.35)',
      },
    },
  },
  plugins: [],
}
