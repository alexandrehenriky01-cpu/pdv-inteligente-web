/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#05070D',
          surface: '#0A0E19',
          raised:  '#121826',
          border:  '#1F2433',
        },
        accent: {
          purple:  '#7C3AED',
          magenta: '#C026D3',
          glow:    '#A855F7',
        },
        price: '#22E06B',
        danger: '#F43F5E',
        text: {
          primary:   '#F5F5F7',
          secondary: '#A1A1AA',
          muted:     '#71717A',
        },
      },
      backgroundImage: {
        'cta':       'linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)',
        'cta-hover': 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
        'card-glow': 'radial-gradient(circle at top right, rgba(124,58,237,0.08), transparent 60%)',
        'progress':  'linear-gradient(90deg, #7C3AED 0%, #C026D3 100%)',
      },
      boxShadow: {
        'cta':       '0 8px 24px -4px rgba(124, 58, 237, 0.45)',
        'card':      '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        'glow-pink': '0 0 32px rgba(192, 38, 211, 0.35)',
      },
      borderRadius: {
        'card': '20px',
        'item': '14px',
        'pill': '9999px',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}