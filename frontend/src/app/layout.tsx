import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

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
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-surface font-sans text-content-primary antialiased">
        <Navbar />

        {/* Nội dung chính – mỗi trang tự quyết định độ rộng container */}
        <main className="flex-1 w-full">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
