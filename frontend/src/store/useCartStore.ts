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
  toppingNames: string[];
  quantity: number;
  estimatedUnitPrice: number; // Đơn giá tạm tính (basePrice + sizePrice + toppings)
  currency: 'VND';
}

export interface CartState {
  items: CartItem[];
  totalAmount: number; // Tổng tiền tạm tính toàn bộ giỏ hàng
  badgeCount: number; // Tổng số lượng ly hiển thị trên Badge icon
  pendingOrderId: string | null; // ID đơn hàng PENDING đang chờ thanh toán (Quyết định D2)
  pendingCartSignature: string | null; // Signature đơn hàng hiện tại

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItem: (
    currentCartItemId: string,
    updates: {
      size: 'S' | 'M' | 'L';
      toppingIds: string[];
      toppingNames?: string[];
      estimatedUnitPrice: number;
      quantity?: number;
    },
  ) => void;
  setPendingOrder: (orderId: string | null, signature: string | null) => void;
  clearPendingOrder: () => void;
  setPendingOrderId: (orderId: string | null) => void;
  clearCart: () => void; // Chỉ gọi khi đơn thanh toán PAID thành công (Quyết định D2)
}

/** Giới hạn số lượng mỗi dòng (Quyết định D5). */
export const MAX_QUANTITY_PER_LINE = 99;

/**
 * Tính chuỗi signature ổn định từ giỏ hàng và mã khuyến mãi.
 * Dùng để kiểm tra giỏ hàng có bị thay đổi sau khi tạo đơn PENDING hay không.
 */
export function computeCartSignature(items: CartItem[], promotionCode?: string): string {
  const sortedLines = [...items]
    .map((item) => ({
      productId: item.productId,
      size: item.size,
      toppingIds: [...item.toppingIds].sort(),
      quantity: item.quantity,
    }))
    .sort((a, b) =>
      `${a.productId}-${a.size}-${a.toppingIds.join(',')}`.localeCompare(
        `${b.productId}-${b.size}-${b.toppingIds.join(',')}`,
      ),
    );

  const cleanPromo = (promotionCode || '').trim().toUpperCase();
  return JSON.stringify({ lines: sortedLines, promo: cleanPromo });
}

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
      pendingCartSignature: null,

      setPendingOrderId: (orderId) => set({ pendingOrderId: orderId }),

      setPendingOrder: (orderId, signature) =>
        set({ pendingOrderId: orderId, pendingCartSignature: signature }),

      clearPendingOrder: () =>
        set({ pendingOrderId: null, pendingCartSignature: null }),

      addItem: (newItem) => {
        const sortedToppingIds = [...newItem.toppingIds].sort();
        const cartItemId = `${newItem.productId}-${newItem.size}-${sortedToppingIds.join('-')}`;
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
          : [
              ...currentItems,
              {
                ...newItem,
                id: cartItemId,
                toppingIds: sortedToppingIds,
                toppingNames: newItem.toppingNames || [],
              },
            ];

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

      updateItem: (currentCartItemId, updates) => {
        const currentItems = get().items;
        const targetItem = currentItems.find((item) => item.id === currentCartItemId);
        if (!targetItem) return;

        const newSize = updates.size ?? targetItem.size;
        const newToppings = [...(updates.toppingIds ?? targetItem.toppingIds)].sort();
        const newToppingNames = updates.toppingNames ?? targetItem.toppingNames ?? [];
        const newCartItemId = `${targetItem.productId}-${newSize}-${newToppings.join('-')}`;
        const newQuantity = updates.quantity ?? targetItem.quantity;
        const newPrice = updates.estimatedUnitPrice ?? targetItem.estimatedUnitPrice;

        if (newCartItemId === currentCartItemId) {
          const updatedItems = currentItems.map((item) =>
            item.id === currentCartItemId
              ? {
                  ...item,
                  size: newSize,
                  toppingIds: newToppings,
                  toppingNames: newToppingNames,
                  estimatedUnitPrice: newPrice,
                  quantity: Math.min(newQuantity, MAX_QUANTITY_PER_LINE),
                }
              : item,
          );
          set(summarize(updatedItems));
          return;
        }

        const existingSame = currentItems.find((item) => item.id === newCartItemId);
        let updatedItems: CartItem[];
        if (existingSame) {
          updatedItems = currentItems
            .filter((item) => item.id !== currentCartItemId)
            .map((item) =>
              item.id === newCartItemId
                ? {
                    ...item,
                    quantity: Math.min(item.quantity + newQuantity, MAX_QUANTITY_PER_LINE),
                    estimatedUnitPrice: newPrice,
                  }
                : item,
            );
        } else {
          updatedItems = currentItems.map((item) =>
            item.id === currentCartItemId
              ? {
                  ...item,
                  id: newCartItemId,
                  size: newSize,
                  toppingIds: newToppings,
                  toppingNames: newToppingNames,
                  estimatedUnitPrice: newPrice,
                  quantity: Math.min(newQuantity, MAX_QUANTITY_PER_LINE),
                }
              : item,
          );
        }
        set(summarize(updatedItems));
      },

      clearCart: () => {
        set({
          items: [],
          totalAmount: 0,
          badgeCount: 0,
          pendingOrderId: null,
          pendingCartSignature: null,
        });
      },
    }),
    {
      name: 'brewlite_cart_storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 || !persistedState) {
          return {
            items: [],
            totalAmount: 0,
            badgeCount: 0,
            pendingOrderId: null,
            pendingCartSignature: null,
          };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
