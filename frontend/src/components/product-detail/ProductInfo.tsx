'use client';

import { Ban } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { formatVND } from '@/lib/format-currency';
import { ProductDetail } from '@/types/product';

interface ProductInfoProps {
  product: ProductDetail;
}

/** Cột trái: ảnh sản phẩm (kèm huy hiệu "Hết hàng"). */
export function ProductGallery({ product }: ProductInfoProps) {
  const soldOut = !product.isAvailable;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-border-warm/70 bg-surface-milk shadow-card-hover">
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        muted={soldOut}
        className="h-full w-full object-cover"
      />
      {soldOut && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy/55 backdrop-blur-[2px]">
          <span className="-rotate-6 rounded-full bg-[#BA1A1A] px-8 py-2 text-xl font-bold uppercase tracking-widest text-white shadow-dock">
            Hết hàng
          </span>
        </div>
      )}
    </div>
  );
}

/** Tên, giá gốc và thông báo ngừng bán. */
export default function ProductInfo({ product }: ProductInfoProps) {
  const soldOut = !product.isAvailable;
  const smallest = product.sizePrices[0];

  return (
    <div className="flex flex-col gap-3">
      {soldOut && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-light p-4 text-danger-text"
        >
          <Ban className="mt-0.5 h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-bold">Sản phẩm không còn bán / Hết hàng</p>
            <p className="text-xs opacity-90">
              Bạn vẫn có thể xem thông tin món, nhưng chưa thể thêm vào giỏ hàng. Vui lòng
              chọn món khác.
            </p>
          </div>
        </div>
      )}

      <h1 className="text-[28px] font-extrabold leading-9 tracking-tight text-navy lg:text-[32px] lg:leading-10">
        {product.name}
      </h1>

      <div className="flex items-baseline gap-2">
        <span className="text-xl font-extrabold text-primary">
          {formatVND(product.basePrice)}
        </span>
        <span className="text-xs text-content-secondary">
          Giá gốc{smallest ? ` ly Size ${smallest.size}` : ''}
        </span>
      </div>
    </div>
  );
}
