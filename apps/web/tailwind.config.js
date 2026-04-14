/** @type {import('tailwindcss').Config} */
module.exports = {
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
        ink: {
          DEFAULT: '#0f1117',
          2: '#13161f',
          3: '#1c202e',
          4: '#252a3a',
        },
        line: {
          DEFAULT: '#1e2333',
          2: '#2a3048',
        },
        brand: {
          blue: '#2d7dd2',
          green: '#1fa870',
          amber: '#e8a020',
          red: '#d94040',
          purple: '#7c5cbf',
        },
      },
    },
  },
  plugins: [],
}
