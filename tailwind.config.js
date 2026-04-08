/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: '#E11D48',
        'primary-dark': '#BE123C',
        'primary-light': '#FB7185',
        accent: '#FB3B62',

        // Surfaces
        background: '#080808',
        surface: '#111111',
        'surface-2': '#181818',
        'surface-3': '#1F1F1F',
        text: '#FAFAFA',

        // Semantic
        success: '#10B981',
        'success-bg': 'rgba(16, 185, 129, 0.10)',
        warning: '#F59E0B',
        'warning-bg': 'rgba(245, 158, 11, 0.10)',
        danger: '#F43F5E',
        'danger-bg': 'rgba(244, 63, 94, 0.10)',
        info: '#3B82F6',
        'info-bg': 'rgba(59, 130, 246, 0.10)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'glow-primary': '0 0 0 1px rgba(225,29,72,0.2), 0 8px 32px rgba(225,29,72,0.25)',
        'glow-primary-lg': '0 0 0 1px rgba(225,29,72,0.3), 0 16px 48px rgba(225,29,72,0.35)',
        'glow-success': '0 0 0 1px rgba(16,185,129,0.2), 0 8px 24px rgba(16,185,129,0.2)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.3)',
        'card-lg': '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 60px rgba(0,0,0,0.45)',
        'card-hover': '0 1px 0 rgba(255,255,255,0.08) inset, 0 16px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(225,29,72,0.15)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E11D48 0%, #FB3B62 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, rgba(225,29,72,0.15) 0%, rgba(251,59,98,0.05) 100%)',
        'gradient-mesh':
          'radial-gradient(at 20% 0%, rgba(225,29,72,0.15) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(251,59,98,0.10) 0px, transparent 50%)',
        'noise':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      animation: {
        'slide-in': 'slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 160ms ease-out',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
