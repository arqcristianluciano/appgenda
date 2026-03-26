/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cabinet Grotesk"', 'ui-sans-serif', 'system-ui'],
        serif: ['"Instrument Serif"', 'ui-serif'],
        mono: ['"DM Mono"', 'ui-monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#1C1A17',
          2: '#5C5850',
          3: '#9C9890',
          4: '#C8C4BC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F0EDE8',
          3: '#E8E4DD',
          bg: '#F7F4EF',
        },
        accent: {
          DEFAULT: '#2B5E3E',
          2: '#3D7A54',
          light: '#E8F2EC',
          pale: '#F0F7F3',
        },
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
