import Link from 'next/link';
import { Coffee, CreditCard, Wallet } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border-warm/70 bg-surface-milk">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-surface-milk">
                <Coffee className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-base font-extrabold text-navy">BrewLite</span>
            </div>
            <p className="text-sm leading-relaxed text-content-secondary">
              Đặt đồ uống nhanh chóng, thanh toán không tiền mặt cho nhịp sống đô thị.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-navy">Khám phá</h3>
            <ul className="space-y-2 text-sm text-content-secondary">
              <li>
                <Link href="/menu" className="transition-colors hover:text-primary">
                  Thực đơn
                </Link>
              </li>
              <li>
                <Link href="/cart" className="transition-colors hover:text-primary">
                  Giỏ hàng
                </Link>
              </li>
              <li>
                <Link href="/orders" className="transition-colors hover:text-primary">
                  Lịch sử đơn hàng
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-navy">Thanh toán không tiền mặt</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-warm/60 bg-surface-sand px-4 py-2 text-xs font-semibold text-navy">
                <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                Ví điện tử
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border-warm/60 bg-surface-sand px-4 py-2 text-xs font-semibold text-navy">
                <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
                Thẻ ngân hàng
              </span>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-border-subtle pt-6 text-center text-xs text-content-secondary">
          BrewLite © 2026 – Đồ án Công nghệ Phần mềm
        </p>
      </div>
    </footer>
  );
}
