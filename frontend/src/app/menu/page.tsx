import type { Metadata } from 'next';
import ProductCatalogView from '@/components/product-catalog/ProductCatalogView';

export const metadata: Metadata = {
  title: 'Thực đơn | BrewLite',
  description:
    'Khám phá thực đơn cà phê, trà và trái cây của BrewLite. Tìm món nhanh, chọn size và topping rồi thanh toán không tiền mặt.',
};

export default function MenuPage() {
  return <ProductCatalogView />;
}
