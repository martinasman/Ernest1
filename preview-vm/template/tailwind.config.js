/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #3b82f6)',
          light: 'var(--color-primary-light, #60a5fa)',
          dark: 'var(--color-primary-dark, #2563eb)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #6366f1)',
          light: 'var(--color-secondary-light, #818cf8)',
        },
        accent: 'var(--color-accent, #f59e0b)',
      },
    },
  },
  plugins: [],
}
