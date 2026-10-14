/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: { surface: 'var(--ui-radius)', guide: 'var(--guide-radius)', admin: 'var(--admin-radius)', 'feedback-panel': 'var(--feedback-panel-radius)' },
      boxShadow: { surface: 'var(--ui-shadow)', guide: 'var(--guide-shadow)', admin: 'var(--admin-shadow)', 'admin-action': 'var(--admin-action-shadow)' },
      backdropBlur: { surface: 'var(--ui-blur)', guide: 'var(--guide-blur)', admin: 'var(--admin-blur)' },
      backgroundImage: { 'guide-hero': 'var(--guide-background)', 'admin-hero': 'var(--admin-background)', 'admin-action': 'var(--admin-action-background)' },
      colors: {
        directory: {
          background: 'var(--directory-page-background)',
          surface: 'var(--directory-surface)',
          text: 'var(--directory-text)',
          border: 'var(--directory-border)',
          soft: 'var(--directory-soft)',
        },
        feedback: {
          accent: 'var(--feedback-accent)',
          soft: 'var(--feedback-accent-soft)',
          surface: 'var(--feedback-surface)',
          text: 'var(--feedback-text)',
          border: 'var(--feedback-border)',
          highlight: 'var(--feedback-highlight-border)',
          glass: 'var(--feedback-glass)',
        },
        staff: {
          surface: 'var(--teacher-surface)',
          muted: 'var(--staff-muted-surface)',
          text: 'var(--teacher-text)',
          border: 'var(--staff-border)',
          glass: 'var(--staff-glass)',
        },
        admin: {
          background: 'var(--admin-page-background)',
          heading: 'var(--admin-text)',
          body: 'var(--admin-body-text)',
          soft: 'var(--admin-muted-surface)',
          hover: 'var(--admin-primary-hover)',
          surface: 'var(--admin-surface)',
          muted: 'var(--admin-muted-surface)',
          text: 'var(--admin-text)',
          border: 'var(--admin-border)',
          glass: 'var(--admin-glass)',
        },
        guide: {
          surface: 'var(--guide-surface)',
          text: 'var(--guide-text)',
          border: 'var(--guide-border)',
          glass: 'var(--guide-glass)',
        },
        white: "#ffffff",
        primary: {
          DEFAULT: "#fc5d01",  // Cam đậm
          light: "#fedac2",    // Cam nhạt rất nhẹ
          medium: "#fdbc94",   // Cam nhạt trung bình
          bright: "#ffac7b",   // Cam sáng hơn
          vivid: "#fd7f33",    // Cam rực
        }
      },
      animation: {
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'fadeIn': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'fadeIn': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        }
      }
    },
  },
  plugins: [],
}
