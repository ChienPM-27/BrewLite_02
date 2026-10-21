// frontend/src/types/product.ts

export type ProductSize = 'S' | 'M' | 'L';

export interface SizePrice {
  size: ProductSize;
  priceAdjustment: number;
}

/**
 * Sản phẩm trong danh sách Menu (GET /api/v1/products).
 * Dùng chung cho Product Catalog và Cart/Detail.
 */
export interface ProductItem {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryName: string | null;
  sizePrices: SizePrice[];
}

export interface ProductTopping {
  id: string;
  name: string;
  price: number;
}

/** Chi tiết sản phẩm (GET /api/v1/products/:id) – Quyết định D3 & D5. */
export interface ProductDetail {
  id: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  currency: 'VND';
  isAvailable: boolean;
  sizePrices: SizePrice[];
  toppings: ProductTopping[];
}
