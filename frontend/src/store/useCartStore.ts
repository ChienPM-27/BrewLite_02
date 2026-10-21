// frontend/src/store/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  /**
   * Khóa định danh duy nhất của từng dòng giỏ hàng:
   * Được sinh từ: `${productId}-${size}-${toppingIds.sort().join('-')}`
   * Giúp phân biệt chính xác 2 ly cùng loại, cùng size nhưng khác Topping.
   */
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  size: 'S' | 'M' | 'L';
  toppingIds: string[];
  quantity: number;
  estimatedUnitPrice: number; // Đơn giá tạm tính (basePrice + sizePrice + toppings)
  currency: 'VND';
}

export interface CartState {
  items: CartItem[];
  totalAmount: number; // Tổng tiền tạm tính toàn bộ giỏ hàng
  badgeCount: number; // Tổng số lượng ly hiển thị trên Badge icon
  pendingOrderId: string | null; // ID đơn hàng PENDING đang chờ thanh toán (Quyết định D2)

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setPendingOrderId: (orderId: string | null) => void;
  clearCart: () => void; // Chỉ gọi khi đơn thanh toán PAID thành công (Quyết định D2)
}

/** Giới hạn số lượng mỗi dòng (Quyết định D5). */
const MAX_QUANTITY_PER_LINE = 99;

function summarize(items: CartItem[]) {
  return {
    items,
    totalAmount: items.reduce(
      (sum, item) => sum + item.estimatedUnitPrice * item.quantity,
      0,
    ),
    badgeCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalAmount: 0,
      badgeCount: 0,
      pendingOrderId: null,

      setPendingOrderId: (orderId) => set({ pendingOrderId: orderId }),

      addItem: (newItem) => {
        const cartItemId = `${newItem.productId}-${newItem.size}-${[...newItem.toppingIds]
          .sort()
          .join('-')}`;
        const currentItems = get().items;
        const existing = currentItems.find((item) => item.id === cartItemId);

        const updatedItems = existing
          ? currentItems.map((item) =>
              item.id === cartItemId
                ? {
                    ...item,
                    quantity: Math.min(
                      item.quantity + newItem.quantity,
                      MAX_QUANTITY_PER_LINE,
                    ),
                  }
                : item,
            )
          : [...currentItems, { ...newItem, id: cartItemId }];

        set(summarize(updatedItems));
      },

      removeItem: (cartItemId) => {
        set(summarize(get().items.filter((item) => item.id !== cartItemId)));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        const updatedItems = get().items.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE) }
            : item,
        );
        set(summarize(updatedItems));
      },

      clearCart: () => {
        set({ items: [], totalAmount: 0, badgeCount: 0, pendingOrderId: null });
      },
    }),
    {
      name: 'brewlite_cart_storage', // Key lưu trong LocalStorage
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
