/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Clarika Geometric / Grotesque proxy — Plus Jakarta Sans is the closest free match
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ─── Everest surface tokens ───────────────────────────────────────────
        evr: {
          // Surfaces
          'surface-root':      '#f8f6f6',  // page background (warm off-white)
          'surface-primary':   '#ffffff',  // cards
          'surface-secondary': '#f2f0f0',  // secondary fills
          'surface-hovered':   '#f5f3f3',  // card hover
          'surface-inverse':   '#303033',  // dark inverse (feature nav selected)

          // Text
          'text-high':    '#1f1f23',  // high emphasis
          'text-default': '#46464a',  // default body
          'text-low':     '#5e5e62',  // low emphasis / captions
          'text-inverse': '#f2f0f0',  // text on dark surfaces

          // Brand
          'blue-400': '#3067db',  // primary brand blue
          'blue-500': '#1f45b2',  // hover
          'blue-600': '#102789',  // pressed
          'blue-tint': '#ebf0fc', // light tint for bg

          // Status
          'success':       '#078d79',
          'success-dark':  '#096255',
          'success-tint':  '#e6f5f2',
          'error':         '#c64e33',
          'error-tint':    '#fdf0ed',
          'warning':       '#efc056',
          'warning-text':  '#985d10',
          'warning-tint':  '#fdf8ec',

          // Borders
          'border-primary':    '#919094',  // inputs / high-contrast
          'border-decorative': '#e1e2ed',  // cards / dividers
          'border-subtle':     '#c5c6d0',  // subtle separators

          // Focus
          'focus': '#3067db',
        },
        // ─── Category accent colors (within Everest spirit) ───────────────────
        cat: {
          payroll:     { DEFAULT: '#3067db', tint: '#ebf0fc' },
          workforce:   { DEFAULT: '#0a9e8a', tint: '#e5f7f5' },
          compliance:  { DEFAULT: '#c64e33', tint: '#fdf0ed' },
          talent:      { DEFAULT: '#7c3aed', tint: '#f0eafb' },
          analytics:   { DEFAULT: '#1d7fcc', tint: '#e8f3fc' },
          onboarding:  { DEFAULT: '#d4900a', tint: '#fdf8ec' },
          benefits:    { DEFAULT: '#b53068', tint: '#fceef3' },
          performance: { DEFAULT: '#596ae1', tint: '#eef0fe' },
        },
      },
      borderRadius: {
        'evr-sm': '4px',   // buttons, inputs, tags
        'evr-md': '8px',   // cards
        'evr-lg': '16px',  // modals, large cards
      },
      boxShadow: {
        // All Everest shadows are warm-grey, no color or glow
        'evr-02': '0 1px 4px rgba(31,31,35,0.08)',
        'evr-04': '0 2px 8px rgba(31,31,35,0.12)',
        'evr-06': '0 4px 16px rgba(31,31,35,0.16)',
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.85)' } },
      },
    },
  },
  plugins: [],
}
