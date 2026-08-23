/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fundserp: {
          dark: '#241442',
          hero: '#2d1854',
          primary: '#4f46e5',
          primaryHover: '#4338ca',
          badgeBg: '#3d256e',
          sidebarHover: '#f8fafc',
          activeMenu: '#f0f3ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
