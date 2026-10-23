import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// Plus Jakarta Sans: hiển thị tốt dấu tiếng Việt (theo design system "Warm Roasted Modern")
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BrewLite - Đặt Cà Phê Không Dùng Tiền Mặt',
  description: 'Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
      <body className="min-h-screen flex flex-col bg-surface font-sans text-content-primary antialiased">
        <Navbar />

        {/* Nội dung chính – mỗi trang tự quyết định độ rộng container */}
        <main className="flex-1 w-full">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
