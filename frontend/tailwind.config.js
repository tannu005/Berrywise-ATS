/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1a1a1a', // Deep charcoal
          card: 'rgba(34, 34, 34, 0.7)', // Lighter charcoal for cards
          primary: '#0d9488', // Vibrant teal
          secondary: '#f43f5e', // Coral accents
          accent: '#6ee7b7', // Mint green
          muted: '#64748b', // Slate gray
          highlight: '#c084fc', // Soft lavender
        }
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 15px rgba(13, 148, 136, 0.4)', // Teal glow
      }
    },
  },
  plugins: [],
}
