import { ProductSize } from '@prisma/client';

/** Response của GET /api/v1/products/:id (docs/product-detail/api-contract.md). */
export interface ProductDetailSizePriceDto {
  size: ProductSize;
  priceAdjustment: number;
}

export interface ProductDetailToppingDto {
  id: string;
  name: string;
  price: number;
}

export interface ProductDetailDto {
  id: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  currency: 'VND';
  /** Product.isAvailable && Product.stock > 0. Không trả `stock` ra ngoài. */
  isAvailable: boolean;
  sizePrices: ProductDetailSizePriceDto[];
  /** Toàn bộ topping đang bán (isAvailable && stock > 0) — Quyết định D3. */
  toppings: ProductDetailToppingDto[];
}
