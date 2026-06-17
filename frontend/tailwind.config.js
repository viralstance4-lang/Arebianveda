/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#FFFDF0',
          100: '#FFF8D6',
          200: '#FEEEA3',
          300: '#FDE166',
          400: '#F5D060',
          500: '#D4A017',
          600: '#C8920A',
          700: '#B8860B',
          800: '#8B6508',
          900: '#4A3504',
          accent: '#D4AF37', // premium accent gold — ratings & highlights only
        },
        forest: {
          50:  '#EAF5EE',   // light green
          100: '#D2EADD',
          200: '#A6D5BB',
          300: '#79C098',
          400: '#4DAB76',
          500: '#2F8C5C',
          600: '#1C5C37',   // medium green
          700: '#154A2C',
          800: '#0F3D22',   // primary green
          900: '#0A2D19',   // dark green
        },
        cream: {
          50:  '#FFFEF9',
          100: '#FFFDF5',   // main background
          200: '#FFF8E7',   // card background
          300: '#FFF0C8',
          400: '#FFE49A',
        },
        brown: {
          500: '#4A2C0A',
          700: '#2D1A06',
          900: '#1A0E03',
        },
      },
      fontFamily: {
        serif:  ['Playfair Display', 'Georgia', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient':   'linear-gradient(135deg, #1C5C37 0%, #0F3D22 50%, #0A2D19 100%)',
        'green-gradient':  'linear-gradient(135deg, #34D372 0%, #1A7A3C 100%)',
        'hero-gradient':   'linear-gradient(135deg, #FFFDF5 0%, #EAF5EE 50%, #D2EADD 100%)',
      },
      boxShadow: {
        'gold':   '0 4px 20px rgba(15, 61, 34, 0.25)',
        'gold-lg':'0 8px 40px rgba(15, 61, 34, 0.35)',
        'card':   '0 2px 16px rgba(10, 45, 25, 0.08)',
      },
    },
  },
  plugins: [],
}
