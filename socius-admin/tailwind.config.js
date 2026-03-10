/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f4',
          100: '#fce8e8',
          200: '#f8d5d5',
          300: '#f2b2b2',
          400: '#ea8080',
          500: '#de5252',
          600: '#c93535',
          700: '#a82828', // Close to the button color
          800: '#8c2525',
          900: '#752424',
          950: '#400e0e',
        },
        // Specific brand color derived from the "Socius - Admin" screenshot
        brand: {
          red: '#BD3E3E', 
          dark: '#9F3333', // Button hover or darker variant
        },
        socius: {
          red: '#BD3E3E',
        }
      },
    },
  },
  plugins: [],
}
