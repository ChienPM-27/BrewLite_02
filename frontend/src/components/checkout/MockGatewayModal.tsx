'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { formatVND } from '@/lib/format-currency';
import { PaymentMethod } from '@/services/payment.service';

interface MockGatewayModalProps {
  isOpen: boolean;
  orderNumber: number;
  amount: number;
  method: PaymentMethod;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (forceFail: boolean) => void;
}

export default function MockGatewayModal({
  isOpen,
  orderNumber,
  amount,
  method,
  isProcessing,
  onClose,
  onConfirm,
}: MockGatewayModalProps) {
  const [countdown, setCountdown] = useState(300); // 5 phút

  // Card form mock state
  const [cardNumber, setCardNumber] = useState('9704 1985 2619 1432');
  const [cardHolder, setCardHolder] = useState('NGUYEN VAN A');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardOtp, setCardOtp] = useState('123456');

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(300);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (countdown % 60).toString().padStart(2, '0');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-dock"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Đóng cổng thanh toán"
          className="absolute right-4 top-4 rounded-full p-2 text-content-secondary transition-colors hover:bg-surface-sand hover:text-navy disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Cổng thanh toán */}
        <div className="flex items-center gap-3 border-b border-border-warm pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
            {method === 'E_WALLET' ? (
              <Wallet className="h-6 w-6" />
            ) : (
              <CreditCard className="h-6 w-6" />
            )}
          </div>
          <div>
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-secondary">
              Mô phỏng Sandbox Gateway
            </span>
            <h2 className="text-lg font-extrabold text-navy">
              {method === 'E_WALLET'
                ? 'Cổng thanh toán VietQR / MoMo'
                : 'Cổng thanh toán Thẻ Napas / Visa'}
            </h2>
            <p className="text-xs text-content-secondary">
              Đơn hàng #{orderNumber} • Tổng tiền: {formatVND(amount)}
            </p>
          </div>
        </div>

        {/* Nội dung theo từng phương thức */}
        {method === 'E_WALLET' ? (
          <div className="flex flex-col items-center py-5 text-center">
            {/* Countdown */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-amber-900">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Mã QR hết hạn sau: {minutes}:{seconds}
              </span>
            </div>

            {/* Khung mã QR giả lập trực quan */}
            <div className="relative my-2 rounded-2xl border-2 border-dashed border-primary/40 bg-surface-sand p-4 shadow-card">
              <div className="flex h-52 w-52 flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm">
                <svg
                  viewBox="0 0 100 100"
                  className="h-full w-full text-navy"
                  fill="currentColor"
                >
                  {/* Pattern góc QR */}
                  <rect x="5" y="5" width="26" height="26" rx="4" />
                  <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                  <rect x="13" y="13" width="10" height="10" rx="1" />

                  <rect x="69" y="5" width="26" height="26" rx="4" />
                  <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                  <rect x="77" y="13" width="10" height="10" rx="1" />

                  <rect x="5" y="69" width="26" height="26" rx="4" />
                  <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                  <rect x="13" y="77" width="10" height="10" rx="1" />

                  {/* Pixel blocks giả lập */}
                  <rect x="36" y="8" width="8" height="8" />
                  <rect x="48" y="8" width="6" height="6" />
                  <rect x="58" y="12" width="6" height="6" />
                  <rect x="8" y="36" width="8" height="6" />
                  <rect x="8" y="46" width="6" height="8" />
                  <rect x="18" y="56" width="6" height="6" />

                  {/* Trung tâm: BrewLite Logo Box */}
                  <rect
                    x="35"
                    y="35"
                    width="30"
                    height="30"
                    rx="6"
                    fill="#6F4E37"
                  />
                  <text
                    x="50"
                    y="53"
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    BREW
                  </text>

                  {/* Data blocks dưới */}
                  <rect x="36" y="70" width="8" height="8" />
                  <rect x="48" y="76" width="8" height="8" />
                  <rect x="60" y="68" width="8" height="6" />
                  <rect x="72" y="78" width="6" height="8" />
                  <rect x="82" y="70" width="8" height="8" />
                  <rect x="84" y="38" width="8" height="8" />
                  <rect x="72" y="48" width="8" height="8" />
                </svg>
              </div>
              <span className="mt-2 block text-[11px] font-bold text-navy">
                Quét qua MoMo / ZaloPay / Banking
              </span>
            </div>

            {/* Thông tin chuyển khoản */}
            <div className="mt-2 w-full rounded-2xl border border-border-warm bg-surface-sand/70 p-3 text-left text-xs">
              <div className="flex justify-between py-1">
                <span className="text-content-secondary">Đơn vị nhận:</span>
                <span className="font-bold text-navy">BrewLite Urban Café</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-content-secondary">Số tiền:</span>
                <span className="font-extrabold text-primary">
                  {formatVND(amount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-content-secondary">Nội dung CK:</span>
                <span className="font-mono font-bold text-navy">
                  BREWLITE #{orderNumber}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            {/* Visual Card Preview */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#231710] to-[#553722] p-5 text-white shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-200">
                  Napas / Domestic Card
                </span>
                <CreditCard className="h-6 w-6 text-amber-200" />
              </div>
              <div className="my-4 font-mono text-base font-bold tracking-widest">
                {cardNumber || '•••• •••• •••• ••••'}
              </div>
              <div className="flex items-end justify-between text-xs">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-white/70">
                    Chủ thẻ
                  </span>
                  <span className="font-bold uppercase">
                    {cardHolder || 'NGUYEN VAN A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-white/70">
                    Hết hạn
                  </span>
                  <span className="font-bold">{cardExpiry || '12/28'}</span>
                </div>
              </div>
            </div>

            {/* Card Inputs with Mock Fill */}
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-navy">Số thẻ</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full rounded-xl border border-border-warm bg-surface-sand px-3 py-2 font-mono font-medium text-navy outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-navy">Chủ thẻ</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-border-warm bg-surface-sand px-3 py-2 font-medium text-navy outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-navy">Mã OTP thử nghiệm</label>
                  <input
                    type="text"
                    value={cardOtp}
                    onChange={(e) => setCardOtp(e.target.value)}
                    className="w-full rounded-xl border border-border-warm bg-surface-sand px-3 py-2 font-mono font-medium text-navy outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nút giả lập hành vi cổng thanh toán */}
        <div className="mt-2 flex flex-col gap-2 border-t border-border-warm pt-4">
          <span className="block text-center text-[11px] font-bold text-content-secondary">
            Bấm chọn kịch bản mô phỏng để kiểm thử luồng hệ thống:
          </span>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onConfirm(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#006337] py-3 text-xs font-bold text-white shadow-cta transition-all hover:bg-[#004927] active:scale-95 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isProcessing
                  ? 'Đang xử lý...'
                  : method === 'E_WALLET'
                    ? 'Mô phỏng: Quét QR thành công'
                    : 'Mô phỏng: Nhập OTP thành công'}
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onConfirm(true)}
              className="flex items-center justify-center gap-2 rounded-full border border-danger/40 bg-surface-milk py-3 text-xs font-bold text-danger transition-all hover:bg-danger-light active:scale-95 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              <span>
                {isProcessing
                  ? 'Đang xử lý...'
                  : method === 'E_WALLET'
                    ? 'Mô phỏng: Quét lỗi / Hủy'
                    : 'Mô phỏng: Sai OTP / Lỗi thẻ'}
              </span>
            </button>
          </div>

          <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-content-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-[#006337]" />
            <span>Môi trường Sandbox an toàn không trừ tiền thật</span>
          </div>
        </div>
      </div>
    </div>
  );
}
