/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F7F3',
        ink: '#1F2E28',
        emerald: {
          DEFAULT: '#1B7F5C',
          dark: '#15654A',
          light: '#E6F3EC',
        },
        brick: {
          DEFAULT: '#B33F3F',
          light: '#FBECEC',
        },
        gold: '#C99A2E',
        border: '#E4E1D8',
        muted: '#6B7269',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
