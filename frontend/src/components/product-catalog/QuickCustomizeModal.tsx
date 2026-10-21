'use client';

import { useState } from 'react';
import { Check, Lightbulb, ShoppingBag, X } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import QuantityStepper from '@/components/ui/QuantityStepper';
import { formatSurcharge, formatVND } from '@/lib/format-currency';
import { MOCK_TOPPINGS } from '@/data/mock-products';
import { useCartStore } from '@/store/useCartStore';
import { ProductItem, ProductSize } from '@/types/product';

interface QuickCustomizeModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (summary: string) => void;
}

const MAX_TOPPINGS = 3;

const SWEETNESS_OPTIONS = ['100%', '70%', '50%', '30%', '0%'];
const ICE_OPTIONS = ['100%', '70%', '50%', 'Ít đá', 'Không đá'];

export default function QuickCustomizeModal({
  product,
  isOpen,
  onClose,
  onAdded,
}: QuickCustomizeModalProps) {
  if (!isOpen || !product) return null;

  return (
    <QuickCustomizeModalContent
      product={product}
      onClose={onClose}
      onAdded={onAdded}
    />
  );
}

function QuickCustomizeModalContent({
  product,
  onClose,
  onAdded,
}: {
  product: ProductItem;
  onClose: () => void;
  onAdded: (summary: string) => void;
}) {
  const addItem = useCartStore((state) => state.addItem);

  const defaultSize = product.sizePrices[0]?.size ?? ProductSize.S;
  const [selectedSize, setSelectedSize] = useState<ProductSize>(defaultSize);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [sweetness, setSweetness] = useState('100%');
  const [ice, setIce] = useState('100%');
  const [quantity, setQuantity] = useState(1);

  // Tính giá
  const sizeObj = product.sizePrices.find((sp) => sp.size === selectedSize);
  const sizeAdjustment = sizeObj?.priceAdjustment ?? 0;

  const toppingsPrice = selectedToppings.reduce((sum, tId) => {
    const top = MOCK_TOPPINGS.find((t) => t.id === tId);
    return sum + (top?.price ?? 0);
  }, 0);

  const unitPrice = product.basePrice + sizeAdjustment + toppingsPrice;
  const totalPrice = unitPrice * quantity;

  const toggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) => {
      if (prev.includes(toppingId)) {
        return prev.filter((id) => id !== toppingId);
      }
      if (prev.length >= MAX_TOPPINGS) return prev;
      return [...prev, toppingId];
    });
  };

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size: selectedSize,
      toppingIds: selectedToppings,
      quantity,
      estimatedUnitPrice: unitPrice,
      currency: 'VND',
    });

    const topLabel =
      selectedToppings.length > 0 ? `, ${selectedToppings.length} topping` : '';
    onAdded(`${product.name} (Size ${selectedSize}${topLabel}) × ${quantity}`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-title"
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

        {/* Thông tin sản phẩm vắn tắt */}
        <div className="flex items-center gap-4 border-b border-border-warm pb-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-sand">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[10px] font-bold text-secondary">
              {product.categoryName || 'Đồ uống'}
            </span>
            <h2 id="customize-title" className="text-xl font-extrabold text-navy">
              {product.name}
            </h2>
            <p className="mt-0.5 text-xs text-content-secondary">
              Tùy chỉnh kích thước, topping và định mức theo khẩu vị của bạn.
            </p>
          </div>
        </div>

        {/* Thân tùy chọn */}
        <div className="flex flex-col gap-5 py-4">
          {/* Chọn Size */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-navy">
                1. Chọn kích cỡ (Size)
              </span>
              <span className="text-xs font-semibold text-content-secondary">
                Đang chọn: Size {selectedSize} ({formatSurcharge(sizeAdjustment)})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {product.sizePrices.map((sp) => {
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

          {/* Chọn Topping */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-navy">
                2. Topping thêm (Tối đa {MAX_TOPPINGS})
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
              <span>Gợi ý: Thêm Kem Cheese béo ngậy tạo vị sánh mượt cho cà phê.</span>
            </div>
          </div>

          {/* Độ ngọt & Lượng đá */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-warm bg-surface-milk p-3">
              <div className="mb-1.5 flex justify-between text-xs font-bold text-navy">
                <span>Độ ngọt</span>
                <span className="text-content-secondary font-semibold">{sweetness}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface-sand p-1 text-[11px] font-bold">
                {SWEETNESS_OPTIONS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSweetness(val)}
                    className={`rounded-lg py-1 text-center transition-all ${
                      sweetness === val ? 'bg-primary text-white shadow-card' : 'text-content-roast'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border-warm bg-surface-milk p-3">
              <div className="mb-1.5 flex justify-between text-xs font-bold text-navy">
                <span>Lượng đá</span>
                <span className="text-content-secondary font-semibold">{ice}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface-sand p-1 text-[11px] font-bold">
                {ICE_OPTIONS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setIce(val)}
                    className={`rounded-lg py-1 text-center transition-all ${
                      ice === val ? 'bg-primary text-white shadow-card' : 'text-content-roast'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Số lượng */}
          <div className="flex items-center justify-between rounded-2xl border border-border-warm bg-surface-milk p-3">
            <span className="text-sm font-bold text-navy">Số lượng ly</span>
            <QuantityStepper quantity={quantity} onChange={setQuantity} />
          </div>
        </div>

        {/* Thanh chân trang xác nhận */}
        <div className="mt-2 flex items-center justify-between border-t border-border-warm pt-4">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-content-secondary">
              Đơn giá tạm tính
            </span>
            <span className="text-xl font-extrabold text-primary">
              {formatVND(totalPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-cta transition-all hover:bg-primary-hover active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Thêm vào giỏ hàng – {formatVND(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
