// frontend/src/services/product.service.ts
import { fetchApi } from '@/lib/api-client';
import { ProductDetail, ProductItem } from '@/types/product';
import { getMockProductDetail, MOCK_PRODUCTS } from '@/data/mock-products';

/**
 * Lấy danh sách sản phẩm mở bán và còn hàng
 * Endpoint: GET /api/v1/products (fallback to mock data if offline)
 */
export const getProductCatalog = async (): Promise<ProductItem[]> => {
  try {
    const data = await fetchApi<ProductItem[]>('/products');
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return MOCK_PRODUCTS;
  } catch (err) {
    console.warn('API /products unavailable, using fallback mock data:', err);
    return MOCK_PRODUCTS;
  }
};

/**
 * Lấy chi tiết một sản phẩm kèm size và topping
 * Endpoint: GET /api/v1/products/:id (fallback to mock data if offline)
 */
export const getProductById = async (id: string): Promise<ProductDetail> => {
  try {
    return await fetchApi<ProductDetail>(`/products/${encodeURIComponent(id)}`);
  } catch (err) {
    console.warn(`API /products/${id} unavailable, checking mock data:`, err);
    const mock = getMockProductDetail(id);
    if (mock) return mock;
    // Ném lại lỗi nếu thật sự không tìm thấy
    throw err;
  }
};
