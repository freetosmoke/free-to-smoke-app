/** @type {import('tailwindcss').Config} */
import designSystem from './src/styles/design-system';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: designSystem.colors.primary,
        secondary: designSystem.colors.secondary,
        accent: designSystem.colors.accent,
        success: designSystem.colors.success,
        warning: designSystem.colors.warning,
        error: designSystem.colors.error,
        dark: designSystem.colors.dark,
      },
      fontFamily: designSystem.typography.fontFamily,
      fontSize: designSystem.typography.fontSize,
      fontWeight: designSystem.typography.fontWeight,
      spacing: designSystem.spacing,
      borderRadius: designSystem.borderRadius,
      boxShadow: designSystem.shadows,
      zIndex: designSystem.zIndex,
      screens: designSystem.breakpoints,
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: designSystem.animations.keyframes,
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
    },
  },
  plugins: [],
};
