import type { Metadata } from 'next';
import ProductDetailView from '@/components/product-detail/ProductDetailView';

export const metadata: Metadata = {
  title: 'Chi tiết sản phẩm | BrewLite',
  description:
    'Xem chi tiết đồ uống BrewLite, chọn size, topping và thêm vào giỏ hàng với giá ước tính tức thì.',
};

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailView id={id} />;
}
