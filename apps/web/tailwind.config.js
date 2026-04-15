/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './mocks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'monospace'],
      },
      colors: {
        surface: {
          0:       'var(--surface-0)',
          1:       'var(--surface-1)',
          2:       'var(--surface-2)',
          3:       'var(--surface-3)',
          sidebar: 'var(--surface-sidebar)',
        },
        line: {
          DEFAULT: 'var(--border)',
          2:       'var(--border-2)',
        },
        fg: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        brand: {
          blue:         'var(--blue)',
          'blue-2':     'var(--blue-2)',
          'blue-soft':  'var(--blue-soft)',
          'blue-active':'var(--blue-active)',
          green:        'var(--green)',
          'green-soft': 'var(--green-soft)',
          amber:        'var(--amber)',
          'amber-soft': 'var(--amber-soft)',
          red:          'var(--red)',
          'red-soft':   'var(--red-soft)',
          purple:       'var(--purple)',
          'purple-soft':'var(--purple-soft)',
        },
      },
    },
  },
  plugins: [],
}
