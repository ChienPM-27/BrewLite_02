// frontend/src/services/product.service.ts
import { fetchApi } from '@/lib/api-client';
import { ProductDetail, ProductItem } from '@/types/product';

/**
 * Lấy danh sách sản phẩm mở bán và còn hàng
 * Endpoint: GET /api/v1/products
 */
export const getProductCatalog = async (): Promise<ProductItem[]> => {
  return fetchApi<ProductItem[]>('/products');
};

/**
 * Lấy chi tiết một sản phẩm kèm size và topping
 * Endpoint: GET /api/v1/products/:id
 */
export const getProductById = async (id: string): Promise<ProductDetail> => {
  return fetchApi<ProductDetail>(`/products/${encodeURIComponent(id)}`);
};
