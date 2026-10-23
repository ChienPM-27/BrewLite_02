import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductSize } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Giới hạn nghiệp vụ (D5 + api-contract Order). */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
export const MAX_TOPPINGS_PER_ITEM = 3;
const DEFAULT_SIZE: ProductSize = ProductSize.M;

export interface PricingItemInput {
  productId: string;
  /** `S` | `M` | `L`. Mặc định `M` nếu không truyền. */
  size?: string;
  toppingIds?: string[];
  quantity: number;
}

export interface PricedTopping {
  toppingId: string;
  /** Giá topping chốt tại thời điểm tính (dùng để lưu OrderItemTopping.price). */
  price: number;
}

export interface PricedLine {
  productId: string;
  size: ProductSize;
  quantity: number;
  /** basePrice + priceAdjustment(size) — khớp OrderItem.unitPrice (docs/order). */
  unitPrice: number;
  /** Σ giá topping của 1 sản phẩm. */
  toppingTotal: number;
  /**
   * basePrice + priceAdjustment(size) + Σ topping — "unitPrice" theo công thức
   * hiển thị của docs/product-detail (dành cho Cart/FE, không lưu vào OrderItem).
   */
  unitPriceWithToppings: number;
  /** (unitPrice + toppingTotal) × quantity. */
  lineTotal: number;
  toppings: PricedTopping[];
}

/**
 * Nguồn tính giá DUY NHẤT của hệ thống (.agentrules mục 3).
 * Không bao giờ nhận giá từ client: toàn bộ giá được đọc lại từ DB.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(items: PricingItemInput[]): Promise<{
    lines: PricedLine[];
    subtotal: number;
  }> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Danh sách sản phẩm không được rỗng');
    }

    // 1. Chuẩn hóa & kiểm tra đầu vào (không đụng DB).
    const normalized = items.map((item) => this.normalizeItem(item));

    // 2. Tải dữ liệu giá từ DB (2 query, không N+1).
    const productIds = [...new Set(normalized.map((i) => i.productId))];
    const toppingIds = [...new Set(normalized.flatMap((i) => i.toppingIds))];

    const [products, toppings] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { sizePrices: true },
      }),
      toppingIds.length
        ? this.prisma.topping.findMany({ where: { id: { in: toppingIds } } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));

    // 3. Tính giá từng dòng.
    const lines = normalized.map((item): PricedLine => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(
          `Sản phẩm không tồn tại: ${item.productId}`,
        );
      }
      if (!product.isAvailable) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" đã ngừng bán`,
        );
      }

      const sizePrice = product.sizePrices.find((sp) => sp.size === item.size);
      if (!sizePrice) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" không có size ${item.size}`,
        );
      }

      const pricedToppings = item.toppingIds.map((id): PricedTopping => {
        const topping = toppingMap.get(id);
        if (!topping) {
          throw new BadRequestException(`Topping không tồn tại: ${id}`);
        }
        if (!topping.isAvailable) {
          throw new BadRequestException(
            `Topping "${topping.name}" đã ngừng bán`,
          );
        }
        return { toppingId: topping.id, price: Number(topping.price) };
      });

      const unitPrice =
        Number(product.basePrice) + Number(sizePrice.priceAdjustment);
      const toppingTotal = pricedToppings.reduce((sum, t) => sum + t.price, 0);

      return {
        productId: product.id,
        size: item.size,
        quantity: item.quantity,
        unitPrice,
        toppingTotal,
        unitPriceWithToppings: unitPrice + toppingTotal,
        lineTotal: (unitPrice + toppingTotal) * item.quantity,
        toppings: pricedToppings,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    return { lines, subtotal };
  }

  private normalizeItem(item: PricingItemInput) {
    if (!item || typeof item.productId !== 'string' || !item.productId) {
      throw new BadRequestException('productId không hợp lệ');
    }

    const { quantity } = item;
    if (
      !Number.isInteger(quantity) ||
      quantity < MIN_QUANTITY ||
      quantity > MAX_QUANTITY
    ) {
      throw new BadRequestException(
        `Số lượng phải là số nguyên từ ${MIN_QUANTITY} đến ${MAX_QUANTITY}`,
      );
    }

    const size = (item.size ?? DEFAULT_SIZE) as ProductSize;
    if (!Object.values(ProductSize).includes(size)) {
      throw new BadRequestException('Size phải là S, M hoặc L');
    }

    const toppingIds = item.toppingIds ?? [];
    if (!Array.isArray(toppingIds) || toppingIds.some((id) => !id)) {
      throw new BadRequestException('toppingIds không hợp lệ');
    }
    if (toppingIds.length > MAX_TOPPINGS_PER_ITEM) {
      throw new BadRequestException(
        `Tối đa ${MAX_TOPPINGS_PER_ITEM} topping cho mỗi món`,
      );
    }
    if (new Set(toppingIds).size !== toppingIds.length) {
      throw new BadRequestException('Topping không được trùng lặp');
    }

    return { productId: item.productId, size, quantity, toppingIds };
  }
}
