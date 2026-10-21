// frontend/src/hooks/useHydrated.ts
import { useEffect, useState } from 'react';

/**
 * Trả về true sau khi component đã mount ở client.
 * Dùng cho dữ liệu lấy từ localStorage (giỏ hàng) để tránh lệch HTML giữa server và client.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
