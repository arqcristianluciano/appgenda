/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cabinet Grotesk"', 'ui-sans-serif', 'system-ui'],
        serif: ['"Instrument Serif"', 'ui-serif'],
        mono: ['"DM Mono"', 'ui-monospace'],
      },
      colors: {
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          bg: 'var(--surface-bg)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          2: 'var(--accent-2)',
          light: 'var(--accent-light)',
          pale: 'var(--accent-pale)',
        },
        edge: {
          DEFAULT: 'var(--edge)',
          mid: 'var(--edge-mid)',
          strong: 'var(--edge-strong)',
        },
        sidebar: 'var(--sidebar)',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
    },
  },
  plugins: [],
}
