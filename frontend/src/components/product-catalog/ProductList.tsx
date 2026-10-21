'use client';

import ProductCard from './ProductCard';
import { ProductItem } from '@/types/product';

interface ProductListProps {
  products: ProductItem[];
  onQuickAdd: (product: ProductItem) => void;
}

/** Lưới sản phẩm: 2 cột (mobile) / 3 cột (tablet) / 4 cột (desktop). */
export default function ProductList({ products, onQuickAdd }: ProductListProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onQuickAdd={onQuickAdd} />
      ))}
    </div>
  );
}
