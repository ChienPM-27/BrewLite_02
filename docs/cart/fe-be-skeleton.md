# FE-BE SKELETON: CART STRUCTURE


## 1. Frontend Skeleton (Next.js)

### Thư mục State (Zustand)
`frontend/src/store/useCartStore.ts`
```typescript
import { create } from 'zustand';

interface CartItem {
  productId: string;           
  name: string;                
  imageUrl: string | null;     
  size: 'S' | 'M' | 'L';       
  toppingIds: string[];        
  quantity: number;            
  estimatedUnitPrice: number;  
  currency: 'VND';
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
  badgeCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
}));
```

### Thư mục UI Components (React)
- `frontend/src/components/cart/CartDrawer.tsx` 
- `frontend/src/components/cart/CartItemCard.tsx` 
- `frontend/src/components/cart/CartEmptyState.tsx` 

### Thư mục Services (Gọi API)
`frontend/src/services/order.service.ts`
```typescript
export const checkoutCart = async (cartItems: CartItem[]) => {
};
```

---

## 2. Backend Skeleton (NestJS)

Mặc dù Giỏ hàng được gọi qua API `/orders`, bộ DTO (Data Transfer Object) để nhận Giỏ hàng cần được khai báo chặt chẽ:

### Thư mục DTO (Class Validator)
`backend/src/orders/dto/create-order.dto.ts`
```typescript
import { IsArray, ArrayNotEmpty, ValidateNested, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString()
  productId: string;

  @IsIn(['S', 'M', 'L'])
  size: string;

  @IsArray()
  @IsString({ each: true })
  toppingIds: string[];

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
```