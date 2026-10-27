// frontend/src/hooks/useProductDetail.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { getProductById } from '@/services/product.service';
import { ProductDetail, ProductSize } from '@/types/product';

/** Mỗi món chọn tối đa 3 topping không trùng lặp (BR-CART-08). */
export const MAX_TOPPINGS = 3;
/** Giới hạn số lượng mỗi dòng (Quyết định D5). */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

export type ProductDetailError = 'not-found' | 'invalid-id' | 'network';

export function useProductDetail(id: string) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ProductDetailError | null>(null);

  const [size, setSize] = useState<ProductSize | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(MIN_QUANTITY);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProductById(id);
      setProduct(data);
      // Mặc định chọn size đầu tiên (API đã sắp xếp theo phụ phí tăng dần -> thường là S)
      setSize(data.sizePrices[0]?.size ?? null);
      setToppingIds([]);
      setQuantity(MIN_QUANTITY);
    } catch (err) {
      setProduct(null);
      if (err instanceof ApiError && err.statusCode === 404) {
        setError('not-found');
      } else if (err instanceof ApiError && err.statusCode === 400) {
        setError('invalid-id');
      } else {
        setError('network');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSizePrice = useMemo(
    () => product?.sizePrices.find((sp) => sp.size === size) ?? null,
    [product, size],
  );

  const selectedToppings = useMemo(
    () => product?.toppings.filter((t) => toppingIds.includes(t.id)) ?? [],
    [product, toppingIds],
  );

  const toppingsTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);

  /**
   * Đơn giá 1 ly = basePrice + priceAdjustment(size) + Σ giá topping.
   * Trả về null nếu thiếu dữ liệu (không thay bằng 0 – BR-PROD-06).
   */
  const unitPrice =
    product && selectedSizePrice
      ? product.basePrice + selectedSizePrice.priceAdjustment + toppingsTotal
      : null;

  const totalPrice = unitPrice !== null ? unitPrice * quantity : null;

  const toggleTopping = useCallback((toppingId: string) => {
    setToppingIds((prev) => {
      if (prev.includes(toppingId)) {
        return prev.filter((idItem) => idItem !== toppingId);
      }
      if (prev.length >= MAX_TOPPINGS) {
        return prev;
      }
      return [...prev, toppingId];
    });
  }, []);

  const changeQuantity = useCallback((nextQty: number) => {
    setQuantity(Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, nextQty)));
  }, []);

  const canAddToCart =
    !!product && product.isAvailable && unitPrice !== null && size !== null;

  return {
    product,
    isLoading,
    error,
    retry: load,
    size,
    setSize,
    selectedSizePrice,
    toppingIds,
    selectedToppings,
    toppingsTotal,
    toggleTopping,
    quantity,
    changeQuantity,
    unitPrice,
    totalPrice,
    canAddToCart,
  };
}
