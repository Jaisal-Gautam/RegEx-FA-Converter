/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#f5f4f0',
        surface:  '#ffffff',
        surface2: '#eeecea',
        border:   '#d8d4ce',
        accent:   '#2d6a4f',
        accent2:  '#3a5a8c',
        accent3:  '#8c5a1e',
        ink:      '#1e1c18',
        muted:    '#7a766e',
        danger:   '#b53a2e',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
        '3xs': '0.6rem',
      },
    },
  },
  plugins: [],
}
