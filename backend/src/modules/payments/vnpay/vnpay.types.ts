// ==========================================
// THAM SỐ TẠO URL THANH TOÁN
// ==========================================

export interface CreateVnpayPaymentParams {
  transactionRef: string;
  amount: number;
  orderInfo: string;
  clientIp: string;
}

// ==========================================
// THAM SỐ VNPay IPN
// ==========================================

export interface VnpayIpnParams {
  vnp_Amount?: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_OrderInfo?: string;
  vnp_PayDate?: string;
  vnp_ResponseCode?: string;
  vnp_TmnCode?: string;
  vnp_TransactionNo?: string;
  vnp_TransactionStatus?: string;
  vnp_TxnRef?: string;
  vnp_SecureHash?: string;
  vnp_SecureHashType?: string;
}

export type VnpayIpnQuery = Record<
  string,
  string | string[] | undefined
>;

// ==========================================
// PHẢN HỒI VNPay IPN
// ==========================================

export interface VnpayIpnResponse {
  RspCode: string;
  Message: string;
}