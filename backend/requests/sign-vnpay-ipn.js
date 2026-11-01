#!/usr/bin/env node
// Tạo query IPN VNPay đã ký để test payment.http (không cần tunnel / VNPay thật).
// Dùng: node sign-vnpay-ipn.js <paymentId> <amountVND> [success|failed|badsig|badamount]
// Secret lấy từ biến môi trường VNPAY_HASH_SECRET hoặc backend/.env.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [paymentId, amountVnd, scenario = 'success'] = process.argv.slice(2);
if (!paymentId || !amountVnd) {
  console.error('Usage: node sign-vnpay-ipn.js <paymentId> <amountVND> [success|failed|badsig|badamount]');
  process.exit(1);
}

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return '';
  const m = fs.readFileSync(file, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const secret = readEnv('VNPAY_HASH_SECRET');
const tmnCode = readEnv('VNPAY_TMN_CODE');
if (!secret || !tmnCode) {
  console.error('Thiếu VNPAY_HASH_SECRET / VNPAY_TMN_CODE (đặt trong env hoặc backend/.env)');
  process.exit(1);
}

const ok = scenario !== 'failed';
const amount = scenario === 'badamount' ? Number(amountVnd) * 100 + 100 : Number(amountVnd) * 100;
const params = {
  vnp_Amount: String(amount),
  vnp_BankCode: 'NCB',
  vnp_BankTranNo: 'VNP' + Date.now().toString().slice(-8),
  vnp_CardType: 'ATM',
  vnp_OrderInfo: 'Thanh toan don hang test',
  vnp_PayDate: new Date(Date.now() + 7 * 3600e3).toISOString().replace(/\D/g, '').slice(0, 14),
  vnp_ResponseCode: ok ? '00' : '24',
  vnp_TmnCode: tmnCode,
  vnp_TransactionNo: String(Date.now()).slice(-8),
  vnp_TransactionStatus: ok ? '00' : '02',
  vnp_TxnRef: paymentId,
};

const enc = (v) => encodeURIComponent(v).replace(/%20/g, '+');
const signData = Object.keys(params).sort().map((k) => `${k}=${enc(params[k])}`).join('&');
let hash = crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
if (scenario === 'badsig') hash = hash.replace(/.$/, hash.endsWith('0') ? '1' : '0');

console.log(`${signData}&vnp_SecureHash=${hash}`);
