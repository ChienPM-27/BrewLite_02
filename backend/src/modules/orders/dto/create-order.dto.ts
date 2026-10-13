
export interface CreateOrderItemDto {
  productId: string;
  size?: 'S' | 'M' | 'L';
  quantity: number;
  toppingIds?: string[];
}

export interface CreateOrderDto {
  userId: string;
  items: CreateOrderItemDto[];
}
