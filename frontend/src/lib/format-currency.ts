// frontend/src/lib/format-currency.ts

const vndFormatter = new Intl.NumberFormat('vi-VN');

/** Định dạng tiền VND theo quy ước thiết kế: 35000 -> "35.000đ". */
export function formatVND(amount: number): string {
  return `${vndFormatter.format(amount)}đ`;
}

/** Định dạng phụ phí có dấu cộng: 5000 -> "+5.000đ". */
export function formatSurcharge(amount: number): string {
  return `+${formatVND(amount)}`;
}
