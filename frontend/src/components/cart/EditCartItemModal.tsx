'use client';

import { useState } from 'react';
import { Check, Lightbulb, Save, X } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { formatSurcharge, formatVND } from '@/lib/format-currency';
import { MOCK_PRODUCTS, MOCK_TOPPINGS } from '@/data/mock-products';
import { CartItem, useCartStore } from '@/store/useCartStore';
import { ProductSize } from '@/types/product';

interface EditCartItemModalProps {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (summary: string) => void;
}

const MAX_TOPPINGS = 3;

export default function EditCartItemModal({
  item,
  isOpen,
  onClose,
  onSaved,
}: EditCartItemModalProps) {
  if (!isOpen || !item) return null;

  return (
    <EditCartItemModalContent
      item={item}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function EditCartItemModalContent({
  item,
  onClose,
  onSaved,
}: {
  item: CartItem;
  onClose: () => void;
  onSaved: (summary: string) => void;
}) {
  const updateItem = useCartStore((state) => state.updateItem);

  // Tìm sản phẩm gốc để lấy danh sách size và giá gốc
  const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
  const basePrice = product?.basePrice ?? 35000;
  const availableSizes = product?.sizePrices ?? [
    { size: ProductSize.S, priceAdjustment: 0 },
    { size: ProductSize.M, priceAdjustment: 5000 },
    { size: ProductSize.L, priceAdjustment: 10000 },
  ];

  const [selectedSize, setSelectedSize] = useState<ProductSize>(item.size);
  const [selectedToppings, setSelectedToppings] = useState<string[]>(item.toppingIds);

  const sizeObj = availableSizes.find((sp) => sp.size === selectedSize);
  const sizeAdjustment = sizeObj?.priceAdjustment ?? 0;

  const toppingsPrice = selectedToppings.reduce((sum, tId) => {
    const top = MOCK_TOPPINGS.find((t) => t.id === tId);
    return sum + (top?.price ?? 0);
  }, 0);

  const unitPrice = basePrice + sizeAdjustment + toppingsPrice;
  const lineTotal = unitPrice * item.quantity;

  const toggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) => {
      if (prev.includes(toppingId)) {
        return prev.filter((id) => id !== toppingId);
      }
      if (prev.length >= MAX_TOPPINGS) return prev;
      return [...prev, toppingId];
    });
  };

  const handleSave = () => {
    updateItem(item.id, {
      size: selectedSize,
      toppingIds: selectedToppings,
      estimatedUnitPrice: unitPrice,
      quantity: item.quantity,
    });

    const topCount = selectedToppings.length;
    const topLabel = topCount > 0 ? `, ${topCount} topping` : ', không topping';
    onSaved(`Đã cập nhật ${item.name} (Size ${selectedSize}${topLabel})`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-item-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border-warm bg-surface-milk p-6 shadow-dock"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-full p-2 text-content-secondary transition-colors hover:bg-surface-sand hover:text-navy"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Thông tin món đang sửa */}
        <div className="flex items-center gap-4 border-b border-border-warm pb-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-sand">
            <ProductImage
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[10px] font-bold text-secondary">
              Thay đổi tùy chọn
            </span>
            <h2 id="edit-item-title" className="text-xl font-extrabold text-navy">
              {item.name}
            </h2>
            <p className="mt-0.5 text-xs text-content-secondary">
              Số lượng đang chọn: {item.quantity} ly
            </p>
          </div>
        </div>

        {/* Các mục điều chỉnh */}
        <div className="flex flex-col gap-5 py-4">
          {/* Đổi kích cỡ (Size) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-navy">
                1. Kích cỡ (Size)
              </span>
              <span className="text-xs font-semibold text-content-secondary">
                Đang chọn: Size {selectedSize} ({formatSurcharge(sizeAdjustment)})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {availableSizes.map((sp) => {
                const active = sp.size === selectedSize;
                return (
                  <button
                    key={sp.size}
                    type="button"
                    onClick={() => setSelectedSize(sp.size)}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all ${
                      active
                        ? 'border-primary bg-primary text-white shadow-card'
                        : 'border-border-warm bg-surface-milk text-content-roast hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-bold">Size {sp.size}</span>
                    <span className={`text-xs ${active ? 'text-white/90' : 'text-primary font-semibold'}`}>
                      {formatSurcharge(sp.priceAdjustment)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Đổi Topping */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-navy">
                2. Topping đính kèm (Tối đa {MAX_TOPPINGS})
              </span>
              <span className="text-xs font-semibold text-content-secondary">
                (Đã chọn {selectedToppings.length}/{MAX_TOPPINGS})
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {MOCK_TOPPINGS.map((top) => {
                const checked = selectedToppings.includes(top.id);
                const reachedLimit = selectedToppings.length >= MAX_TOPPINGS && !checked;

                return (
                  <label
                    key={top.id}
                    className={`flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-3 transition-all ${
                      checked
                        ? 'border-primary bg-surface-milk shadow-card ring-2 ring-primary/20'
                        : 'border-border-warm bg-surface-milk hover:border-primary/40'
                    } ${reachedLimit ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={reachedLimit}
                        onChange={() => toggleTopping(top.id)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                          checked
                            ? 'border-primary bg-primary text-white'
                            : 'border-outline bg-surface-milk'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-navy">{top.name}</h4>
                        <p className="text-[10px] text-content-secondary">{top.description}</p>
                      </div>
                    </div>
                    <span className="mt-1 text-right text-xs font-bold text-primary">
                      {formatSurcharge(top.price)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-[#FAF2E8]/60 px-3 py-1.5 text-xs text-content-roast">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>Topping sẽ được cập nhật và tính lại tổng tiền ngay trong giỏ hàng.</span>
            </div>
          </div>
        </div>

        {/* Chân trang xác nhận */}
        <div className="mt-2 flex items-center justify-between border-t border-border-warm pt-4">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-content-secondary">
              Đơn giá mới ({item.quantity} ly)
            </span>
            <span className="text-xl font-extrabold text-primary">
              {formatVND(lineTotal)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border-warm px-4 py-2.5 text-xs font-semibold text-content-roast hover:bg-surface-sand"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
