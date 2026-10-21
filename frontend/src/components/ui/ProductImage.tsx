'use client';

import { useState } from 'react';
import { Coffee } from 'lucide-react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Làm xám ảnh cho sản phẩm hết hàng. */
  muted?: boolean;
}

/**
 * Ảnh sản phẩm. Khi `imageUrl` là null hoặc tải lỗi thì hiển thị placeholder
 * (BR: imageUrl: null không phải lỗi của Product API).
 */
export default function ProductImage({ src, alt, className = '', muted = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (chưa có ảnh)`}
        className={`flex items-center justify-center bg-gradient-to-br from-primary-light to-surface-sand text-primary/50 ${className}`}
      >
        <Coffee className="h-1/4 w-1/4" aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh đến từ nhiều domain bên ngoài (seed data)
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} ${muted ? 'grayscale contrast-75 brightness-95' : ''}`}
    />
  );
}
