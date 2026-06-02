/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F4F7FA',
        surface: '#FFFFFF',
        surfaceBorder: 'rgba(0, 0, 0, 0.04)',
        healthy: '#10B981',
        healthyGlow: 'rgba(16, 185, 129, 0.2)',
        warning: '#F59E0B',
        warningGlow: 'rgba(245, 158, 11, 0.2)',
        critical: '#EF4444',
        criticalGlow: 'rgba(239, 68, 68, 0.2)',
        textMain: '#111827',
        textMuted: '#6B7280',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glow-healthy': '0 0 15px rgba(16, 185, 129, 0.4)',
        'glow-warning': '0 0 15px rgba(245, 158, 11, 0.4)',
        'glow-critical': '0 0 15px rgba(239, 68, 68, 0.4)',
      },
      backdropBlur: {
        'glass': '12px',
      }
    },
  },
  plugins: [],
}
