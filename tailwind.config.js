/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#4B6CB7',
          600: '#3b5a9a',
          700: '#2d4a7d',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#182848',
          600: '#0f172a',
        },
        accent: {
          500: '#FFD700',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
