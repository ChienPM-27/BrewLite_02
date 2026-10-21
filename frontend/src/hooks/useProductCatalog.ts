// frontend/src/hooks/useProductCatalog.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductItem } from '@/types/product';
import { getProductCatalog } from '@/services/product.service';

export const ALL_CATEGORY = 'Tất cả';
export const OTHER_CATEGORY = 'Khác';

/**
 * Hàm chuẩn hóa loại bỏ dấu tiếng Việt (Quyết định 4 của Nhóm trưởng)
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export interface CategoryTab {
  name: string;
  count: number;
}

export function useProductCatalog() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProductCatalog();
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải danh sách thực đơn',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quyết định 3: Trích xuất distinct categoryName theo thứ tự xuất hiện, gom null vào "Khác"
  const categories = useMemo<CategoryTab[]>(() => {
    const counts = new Map<string, number>();
    let uncategorized = 0;

    products.forEach((p) => {
      if (p.categoryName) {
        counts.set(p.categoryName, (counts.get(p.categoryName) ?? 0) + 1);
      } else {
        uncategorized += 1;
      }
    });

    const tabs: CategoryTab[] = [
      { name: ALL_CATEGORY, count: products.length },
      ...Array.from(counts, ([name, count]) => ({ name, count })),
    ];
    if (uncategorized > 0) {
      tabs.push({ name: OTHER_CATEGORY, count: uncategorized });
    }
    return tabs;
  }, [products]);

  // Quyết định 4: Lọc Client-side kết hợp Danh mục và Tìm kiếm không dấu
  const filteredProducts = useMemo(() => {
    const normalizedKeyword = removeVietnameseTones(searchKeyword);

    return products.filter((item) => {
      let matchCategory = true;
      if (selectedCategory === OTHER_CATEGORY) {
        matchCategory = item.categoryName === null;
      } else if (selectedCategory !== ALL_CATEGORY) {
        matchCategory = item.categoryName === selectedCategory;
      }

      const matchSearch =
        !normalizedKeyword ||
        removeVietnameseTones(item.name).includes(normalizedKeyword);

      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchKeyword]);

  /** Nút "Xóa bộ lọc": reset tìm kiếm và về tab "Tất cả". */
  const resetFilters = useCallback(() => {
    setSearchKeyword('');
    setSelectedCategory(ALL_CATEGORY);
  }, []);

  return {
    products: filteredProducts,
    allProductsCount: products.length,
    isLoading,
    error,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchKeyword,
    setSearchKeyword,
    resetFilters,
    retry: loadData,
  };
}
