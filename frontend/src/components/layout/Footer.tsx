import Link from 'next/link';
import { Coffee, Phone, Clock, Mail, Share2, Camera, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border-warm/70 bg-surface-milk shadow-[0_-1px_12px_rgba(37,25,18,0.03)]">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & Promise */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-surface-milk">
                <Coffee className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xl font-extrabold text-navy">BrewLite</span>
            </div>
            <p className="text-xs leading-relaxed text-content-secondary">
              Trải nghiệm cà phê nguyên bản phong cách café-tech tiện lợi, không tiền mặt cho lối sống đô thị hiện đại.
            </p>
            <div className="flex items-center gap-2 text-success-botanical">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <span className="text-xs font-bold">100% Cà phê Robusta &amp; Arabica Bản Địa</span>
            </div>
          </div>

          {/* Column 2: Stores */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-navy">Hệ thống cửa hàng</h3>
            <div className="space-y-1 text-xs text-content-secondary">
              <p className="font-semibold text-navy">📍 Hà Nội:</p>
              <p>48 Tràng Tiền, Hoàn Kiếm, Hà Nội</p>
              <p>12 Tô Ngọc Vân, Tây Hồ, Hà Nội</p>
            </div>
            <div className="space-y-1 pt-1 text-xs text-content-secondary">
              <p className="font-semibold text-navy">📍 TP. Hồ Chí Minh:</p>
              <p>26 Lê Lợi, Bến Nghé, Quận 1, TP.HCM</p>
              <p>102 Thảo Điền, TP. Thủ Đức, TP.HCM</p>
            </div>
          </div>

          {/* Column 3: Contact & Hours */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-navy">Liên hệ &amp; Giờ mở cửa</h3>
            <div className="space-y-2 text-xs text-content-secondary">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>
                  Hotline: <strong className="font-bold text-navy">1900 6868</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Giờ phục vụ: 07:00 - 22:30 hàng ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>cskh@brewlite.vn</span>
              </div>
            </div>
            <div className="pt-2">
              <span className="mb-2 block text-xs font-semibold text-navy">Kết nối cùng BrewLite</span>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-sand text-content-roast transition-all hover:bg-primary hover:text-white">
                  <Share2 className="h-4 w-4" />
                </span>
                <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-sand text-content-roast transition-all hover:bg-primary hover:text-white">
                  <Camera className="h-4 w-4" />
                </span>
                <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-sand text-content-roast transition-all hover:bg-primary hover:text-white">
                  <MessageSquare className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Cashless */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-navy">Thanh toán không tiền mặt</h3>
            <p className="text-xs text-content-secondary">
              Hỗ trợ thanh toán nhanh chóng 1-chạm qua ví điện tử và thẻ ngân hàng liên kết.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-bold text-navy">
              <div className="flex items-center justify-center rounded-xl border border-border-warm/60 bg-surface-sand p-2 text-center shadow-sm">
                MoMo
              </div>
              <div className="flex items-center justify-center rounded-xl border border-border-warm/60 bg-surface-sand p-2 text-center shadow-sm">
                ZaloPay
              </div>
              <div className="flex items-center justify-center rounded-xl border border-border-warm/60 bg-surface-sand p-2 text-center shadow-sm">
                VNPay-QR
              </div>
              <div className="flex items-center justify-center rounded-xl border border-border-warm/60 bg-surface-sand p-2 text-center shadow-sm">
                Visa/Master
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border-warm/50 pt-6 text-xs text-content-secondary md:flex-row">
          <p>© 2026 BrewLite Coffee. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/menu" className="transition-colors hover:text-navy">
              Thực đơn
            </Link>
            <Link href="/cart" className="transition-colors hover:text-navy">
              Giỏ hàng
            </Link>
            <Link href="/orders" className="transition-colors hover:text-navy">
              Đơn hàng
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
