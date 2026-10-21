'use client';

import { useState } from 'react';
import { Ban, Coffee, Flame, Heart, Leaf, Search, Sparkles, Star, Timer } from 'lucide-react';
import ProductImage from '@/components/ui/ProductImage';
import { formatVND } from '@/lib/format-currency';
import { ProductDetail } from '@/types/product';

interface ProductInfoProps {
  product: ProductDetail;
}

/** Cột trái: ảnh sản phẩm kèm thư viện ảnh con, huy hiệu và hồ sơ rang vị. */
export function ProductGallery({ product }: ProductInfoProps) {
  const soldOut = !product.isAvailable;
  const [selectedImage, setSelectedImage] = useState<string | null>(product.imageUrl);

  // Gallery thumbnails: use real or related preview shots
  const thumbnails = [
    product.imageUrl,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=400&auto=format&fit=crop',
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4">
      {/* Khung ảnh chính */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-border-warm/70 bg-surface-milk shadow-card-hover group">
        <ProductImage
          src={selectedImage}
          alt={product.name}
          muted={soldOut}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Huy hiệu Signature Brew & Kcal */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-bold text-white shadow-card backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-[#F5EBE1]" aria-hidden="true" />
            Signature Brew
          </span>
          <span className="flex items-center gap-1 rounded-full bg-surface-milk/85 px-3 py-1 text-[11px] font-bold text-navy shadow-card backdrop-blur-md">
            <Flame className="h-3 w-3 text-primary" aria-hidden="true" />
            165 kcal
          </span>
        </div>

        {/* Nút phóng to / xem chi tiết ảnh */}
        <button
          type="button"
          aria-label="Xem ảnh phóng to"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-milk/90 text-navy shadow-card backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Huy hiệu hết hàng */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/60 backdrop-blur-[2px]">
            <span className="-rotate-6 rounded-full bg-[#BA1A1A] px-8 py-2 text-xl font-bold uppercase tracking-widest text-white shadow-dock">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      {/* Dải ảnh thu nhỏ & Nguồn gốc xuất xứ */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {thumbnails.map((img, idx) => {
            const isCurrent = selectedImage === img;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImage(img)}
                aria-label={`Xem ảnh ${idx + 1}`}
                className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/30 shadow-card'
                    : 'border-border-warm opacity-70 hover:opacity-100'
                }`}
              >
                <ProductImage
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-content-roast">
          <Leaf className="h-4 w-4 text-[#006337]" aria-hidden="true" />
          <span>100% Robusta Buôn Ma Thuột, Đắk Lắk</span>
        </div>
      </div>

      {/* Thẻ Hồ sơ rang vị (Roast Profile) */}
      <div className="flex items-center justify-between rounded-2xl border border-border-warm bg-[#FAF2E8]/60 p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
            <Coffee className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-[13px] font-bold text-navy">
              Rang Đậm Vừa (Medium Dark)
            </h3>
            <p className="text-xs text-content-secondary">
              Hương caramel cháy, socola đắng thanh
            </p>
          </div>
        </div>

        <span className="rounded-full border border-border-warm bg-surface-milk px-3 py-1 text-xs font-bold text-primary shadow-card">
          Chuẩn vị Phin
        </span>
      </div>
    </div>
  );
}

/** Tên, đánh giá, giá gốc, huy hiệu bán chạy, mô tả và nút yêu thích. */
export default function ProductInfo({ product }: ProductInfoProps) {
  const soldOut = !product.isAvailable;
  const smallest = product.sizePrices[0];
  const [isFavorited, setIsFavorited] = useState(false);

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

      {/* Huy hiệu phân loại & Nút yêu thích */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border-warm bg-secondary-container px-3 py-1 text-xs font-bold text-secondary">
            {product.categoryName || 'Cà phê truyền thống'}
          </span>
          <span className="rounded-full bg-[#006337] px-3 py-1 text-xs font-bold text-white shadow-card">
            Bán chạy nhất
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsFavorited((prev) => !prev)}
          aria-label={isFavorited ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-border-warm bg-surface-milk transition-transform hover:scale-110 active:scale-95 ${
            isFavorited ? 'text-[#BA1A1A]' : 'text-content-secondary'
          }`}
        >
          <Heart
            className={`h-5 w-5 ${isFavorited ? 'fill-[#BA1A1A]' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <h1 className="text-[28px] font-extrabold leading-9 tracking-tight text-navy lg:text-[36px] lg:leading-tight">
        {product.name}
      </h1>

      {/* Đánh giá & Thời gian pha chế */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-content-roast">
        <div className="flex items-center gap-1 text-amber-600">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="font-bold text-navy">4.9</span>
          <span className="text-content-secondary">(1.280 đánh giá)</span>
        </div>
        <span className="text-border-warm">•</span>
        <div className="flex items-center gap-1 text-[#006337]">
          <Timer className="h-4 w-4" aria-hidden="true" />
          <span>Chuẩn bị: ~3 phút</span>
        </div>
      </div>

      {/* Giá gốc */}
      <div className="flex items-baseline gap-2 pt-1">
        <span className="text-2xl font-extrabold text-primary">
          {formatVND(product.basePrice)}
        </span>
        <span className="text-xs text-content-secondary font-medium">
          Giá gốc{smallest ? ` ly Size ${smallest.size}` : ''}
        </span>
      </div>

      {/* Mô tả chi tiết */}
      <p className="text-sm leading-relaxed text-content-secondary">
        Hương vị cà phê Robusta Buôn Ma Thuột đậm đà kết hợp cùng lớp sữa đặc béo ngậy thơm ngon, đá viên thanh mát tạo nên ly cà phê truyền thống chuẩn vị Việt.
      </p>
    </div>
  );
}
