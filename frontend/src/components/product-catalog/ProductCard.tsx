'use client';

import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { formatVND } from '@/lib/format-currency';
import { ProductItem } from '@/types/product';

interface ProductCardProps {
  product: ProductItem;
  onQuickAdd: (product: ProductItem) => void;
}

/** Giá hiển thị "Giá từ" = giá gốc + phụ phí size nhỏ nhất. */
export function getStartingPrice(product: ProductItem): number {
  const minAdjustment = product.sizePrices.length
    ? Math.min(...product.sizePrices.map((sp) => sp.priceAdjustment))
    : 0;
  return product.basePrice + minAdjustment;
}

export default function ProductCard({ product, onQuickAdd }: ProductCardProps) {
  const soldOut = !product.isAvailable;
  const canQuickAdd = !soldOut && product.sizePrices.length > 0;
  const detailHref = `/products/${product.id}`;

  // Badges & rating derived or mapped
  const isBestSeller = product.name.includes('Trà đào') || product.name.includes('sữa đá');
  const isFavorite = product.name.includes('Bạc xỉu');

  // Descriptions matching reference design
  const subtitleMap: Record<string, string> = {
    'Cà phê sữa đá': 'Robusta Đắk Lắk đậm đà hòa quyện sữa đặc béo ngọt truyền thống.',
    'Bạc xỉu': 'Phần lớp sữa tươi thơm lừng, sữa đặc mịn ngọt và cà phê Arabica nhẹ nhàng.',
    'Bạc xỉu 3 tầng': 'Phần lớp sữa tươi thơm lừng, sữa đặc mịn ngọt và cà phê Arabica nhẹ nhàng.',
    'Trà đào cam sả': 'Trà đen ủ lạnh kết hợp đào miếng giòn sần sật, nước cốt cam tươi và sả thanh thơm.',
    'Cappuccino': 'Bọt sữa tơ mịn đánh chuẩn barista kết hợp espresso Arabica Cầu Đất nguyên chất.',
    'Cappuccino Nghệ thuật': 'Bọt sữa tơ mịn đánh chuẩn barista kết hợp espresso Arabica Cầu Đất nguyên chất.',
    'Americano': 'Vị cà phê thanh nhẹ, hậu vị êm mượt thích hợp cho phiên làm việc tập trung dài.',
    'Americano Đá': 'Vị cà phê thanh nhẹ, hậu vị êm mượt thích hợp cho phiên làm việc tập trung dài.',
    'Trà vải': 'Hương hoa lài thanh khiết ủ cùng quả vải mọng nước ngọt thanh dịu.',
    'Trà vải lài thơm': 'Hương hoa lài thanh khiết ủ cùng quả vải mọng nước ngọt thanh dịu.',
    'Espresso': 'Chiết xuất chuẩn áp suất, lớp crema vàng óng sánh đặc tràn ngập năng lượng.',
    'Espresso Đậm đà': 'Chiết xuất chuẩn áp suất, lớp crema vàng óng sánh đặc tràn ngập năng lượng.',
    'Trà dâu': 'Dâu tây Đà Lạt tươi giầm cùng trà hoa cúc thanh mát (hết nguyên liệu vụ sáng).',
    'Trà dâu tây tươi': 'Dâu tây Đà Lạt tươi giầm cùng trà hoa cúc thanh mát (hết nguyên liệu vụ sáng).',
  };

  const subtitle = subtitleMap[product.name] || 'Đồ uống tươi mới được pha chế thủ công theo công thức độc quyền.';

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-3xl border border-border-warm/70 bg-surface-milk p-3.5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
        soldOut ? 'opacity-70 grayscale-[20%]' : ''
      }`}
    >
      <Link href={detailHref} className="block" aria-label={`Xem chi tiết ${product.name}`}>
        <div className="relative mb-3.5 aspect-square w-full overflow-hidden rounded-2xl bg-surface-sand">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            muted={soldOut}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Huy hiệu danh mục (Góc trên trái) */}
          {product.categoryName && (
            <span className="absolute left-2.5 top-2.5 rounded-full border border-border-warm/50 bg-surface-milk/95 px-2.5 py-0.5 text-[11px] font-bold text-navy shadow-card backdrop-blur-md">
              {product.categoryName}
            </span>
          )}

          {/* Huy hiệu khuyến mãi (Góc trên phải) */}
          {isBestSeller && !soldOut && (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#006337] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-card">
              Best seller
            </span>
          )}
          {isFavorite && !soldOut && (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#C68B59] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-card">
              Yêu thích
            </span>
          )}

          {/* Huy hiệu đánh giá (Góc dưới trái) */}
          {!soldOut && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-navy/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span>4.9 (1.2k+)</span>
            </div>
          )}

          {/* Lớp phủ khi hết hàng */}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy/30 backdrop-blur-[2px]">
              <span className="rounded-full bg-surface-milk px-3.5 py-1 text-xs font-bold text-navy shadow-card">
                Tạm hết
              </span>
            </div>
          )}
        </div>

        <h3 className="line-clamp-1 text-[17px] font-bold text-navy transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-content-secondary">
          {subtitle}
        </p>
      </Link>

      <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border-subtle/80">
        <div>
          <span className="block text-[11px] font-medium text-content-secondary">Giá từ</span>
          <span
            className={`text-base font-extrabold ${
              soldOut ? 'text-content-secondary line-through' : 'text-primary'
            }`}
          >
            {formatVND(getStartingPrice(product))}
          </span>
        </div>

        {canQuickAdd ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuickAdd(product);
            }}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-surface-milk shadow-card transition-all hover:bg-primary-hover active:scale-90"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        ) : (
          <span className="cursor-not-allowed rounded-full bg-surface-sand px-3.5 py-1.5 text-xs font-semibold text-content-secondary">
            Tạm hết
          </span>
        )}
      </div>
    </article>
  );
}
