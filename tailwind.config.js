/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
        }
      }
    },
  },
  plugins: [],
}
