/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Plus Jakarta Sans được nạp bằng next/font trong app/layout.tsx
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // BrewLite Design System – "Warm Roasted Modern" (frontend/design/Image5.md)
        // Giữ nguyên tên token cũ (navy, primary, success, coffee, surface, content, border, danger)
        // để các trang có sẵn không bị vỡ, chỉ đổi giá trị sang bảng màu cà phê rang.
        navy: {
          DEFAULT: '#231710', // Dark Roast Espresso (màu chữ tiêu đề)
          dark: '#231710',
        },
        primary: {
          DEFAULT: '#6F4E37', // Warm Artisanal Roast
          hover: '#4A2E1B',
          light: '#F5EBE1', // Soft tint
        },
        secondary: {
          DEFAULT: '#7D562D',
          container: '#EDD8C7',
        },
        caramel: '#C68B59',
        success: {
          DEFAULT: '#10D98A', // Status mint
          light: '#E6FCF3',
          text: '#065F46',
          botanical: '#2D5A43', // Tertiary – Botanical Mint
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          text: '#92400E',
        },
        coffee: {
          cream: '#F5EBE1',
          sand: '#F3EDE4',
        },
        surface: {
          DEFAULT: '#FAF7F2', // Creamy canvas
          secondary: '#F3EDE4',
          milk: '#FFFDF9', // Card container
          sand: '#F3EDE4',
          container: '#F5EBE1',
          high: '#F0E2D5',
        },
        content: {
          primary: '#231710',
          secondary: '#7C6E65',
          roast: '#3B271D',
        },
        border: {
          light: '#E8DED2',
          warm: '#E8DACB',
          subtle: '#F0E7DC',
        },
        outline: '#82746D',
        danger: {
          DEFAULT: '#E05A47',
          light: '#FDF2F0',
          text: '#991B1B',
        },
      },
      boxShadow: {
        // Elevation: bóng đổ ám nâu espresso thay cho xám lạnh
        card: '0 2px 8px -2px rgba(35, 23, 16, 0.06), 0 1px 3px -1px rgba(111, 78, 55, 0.04)',
        'card-hover':
          '0 10px 22px -4px rgba(35, 23, 16, 0.08), 0 4px 8px -2px rgba(111, 78, 55, 0.06)',
        dock: '0 20px 30px -6px rgba(35, 23, 16, 0.12), 0 8px 12px -4px rgba(111, 78, 55, 0.05)',
        cta: '0 4px 16px rgba(111, 78, 55, 0.35)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
