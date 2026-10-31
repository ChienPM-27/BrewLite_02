import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  createHmac,
  timingSafeEqual,
} from 'crypto';

import * as querystring from 'querystring';

// Import các hàm hỗ trợ
import {
  sortObject,
  encodeVnpayValue,
  normalizeIpAddress,
  getVietnamDateTime,
} from './vnpay.helper';

// Import các kiểu dữ liệu
import {
  CreateVnpayPaymentParams,
  VnpayIpnQuery,
} from './vnpay.types';

@Injectable()
export class VnpayGatewayService {
  private readonly paymentUrl: string;
  private readonly returnUrl: string;
  private readonly tmnCode: string;
  private readonly hashSecret: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.paymentUrl =
      this.configService.get<string>('VNPAY_URL') ??
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    this.returnUrl =
      this.configService.get<string>('VNPAY_RETURN_URL') ?? '';

    this.tmnCode =
      this.configService.get<string>('VNPAY_TMN_CODE') ?? '';

    this.hashSecret =
      this.configService.get<string>('VNPAY_HASH_SECRET') ?? '';

    if (
      !this.tmnCode ||
      !this.hashSecret ||
      !this.returnUrl
    ) {
      throw new InternalServerErrorException(
        'Thiếu cấu hình VNPay. Vui lòng kiểm tra file .env',
      );
    }
  }

  // ==========================================
  // TẠO URL THANH TOÁN
  // ==========================================

  createPaymentUrl(
    params: CreateVnpayPaymentParams,
  ): string {
    if (
      !params.transactionRef ||
      !params.orderInfo ||
      !params.clientIp
    ) {
      throw new BadRequestException(
        'Thiếu thông tin tạo URL thanh toán VNPay',
      );
    }

    if (
      !Number.isSafeInteger(params.amount) ||
      params.amount <= 0 ||
      !Number.isSafeInteger(params.amount * 100)
    ) {
      throw new BadRequestException(
        'Số tiền thanh toán không hợp lệ',
      );
    }

    const createDate = getVietnamDateTime();

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(params.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.transactionRef,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: normalizeIpAddress(params.clientIp),
      vnp_CreateDate: createDate,
    };

    // Sắp xếp tham số trước khi ký
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi dữ liệu cần ký
    const signData = querystring.stringify(
      sortedParams,
      '&',
      '=',
      {
        encodeURIComponent: encodeVnpayValue,
      },
    );

    // Tạo chữ ký HMAC SHA512
    const secureHash = createHmac(
      'sha512',
      this.hashSecret,
    )
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    // Tạo URL thanh toán
    const paymentUrl =
      this.paymentUrl +
      '?' +
      querystring.stringify(
        {
          ...sortedParams,
          vnp_SecureHash: secureHash,
        },
        '&',
        '=',
        {
          encodeURIComponent: encodeVnpayValue,
        },
      );

    return paymentUrl;
  }

  // ==========================================
  // XÁC MINH CHỮ KÝ IPN
  // ==========================================

  verifyIpnSignature(
    params: VnpayIpnQuery,
  ): boolean {
    const secureHash = params['vnp_SecureHash'];

    // Kiểm tra chữ ký có đúng định dạng không
    if (
      typeof secureHash !== 'string' ||
      !/^[a-fA-F0-9]{128}$/.test(secureHash)
    ) {
      return false;
    }

    const filteredParams: Record<string, string> = {};

    // Loại bỏ các trường chữ ký khỏi dữ liệu cần xác minh
    for (const key of Object.keys(params)) {
      if (
        key === 'vnp_SecureHash' ||
        key === 'vnp_SecureHashType'
      ) {
        continue;
      }

      const value = params[key];

      if (typeof value === 'string') {
        filteredParams[key] = value;
      }
    }

    // Sắp xếp lại tham số
    const sortedParams = sortObject(filteredParams);

    // Tạo chuỗi dữ liệu xác minh
    const signData = querystring.stringify(
      sortedParams,
      '&',
      '=',
      {
        encodeURIComponent: encodeVnpayValue,
      },
    );

    // Tính chữ ký từ dữ liệu nhận được
    const calculatedHash = createHmac(
      'sha512',
      this.hashSecret,
    )
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    // Chuyển chữ ký thành Buffer
    const receivedBuffer = Buffer.from(
      secureHash,
      'hex',
    );

    const calculatedBuffer = Buffer.from(
      calculatedHash,
      'hex',
    );

    // Kiểm tra độ dài trước khi so sánh
    if (
      receivedBuffer.length !== calculatedBuffer.length
    ) {
      return false;
    }

    // So sánh an toàn
    return timingSafeEqual(
      receivedBuffer,
      calculatedBuffer,
    );
  }
}