/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc', // light gray
        surface: '#ffffff',
        primary: '#0ea5e9', // sky blue
        'primary-hover': '#0284c7',
        danger: '#991b1b', // blood red
        'danger-hover': '#7f1d1d',
        text: '#1e293b',
        'text-light': '#64748b',
        border: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'glass-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      }
    },
  },
  plugins: [],
}
