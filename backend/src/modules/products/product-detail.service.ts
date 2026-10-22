import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductDetailDto } from './dto/product-detail.dto';

/** Ký tự hợp lệ của id (CUID & biến thể). Sai định dạng -> 400, đúng nhưng không có -> 404. */
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

@Injectable()
export class ProductDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductById(id: string): Promise<ProductDetailDto> {
    if (!PRODUCT_ID_PATTERN.test(id)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }

    const [product, toppings] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id },
        include: {
          sizePrices: {
            orderBy: [{ priceAdjustment: 'asc' }, { size: 'asc' }],
          },
        },
      }),
      // D3: không có bảng ProductTopping -> trả toàn bộ topping đang bán.
      this.prisma.topping.findMany({
        where: { isAvailable: true, stock: { gt: 0 } },
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, price: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm với ID cung cấp');
    }

    return {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePrice: Number(product.basePrice),
      currency: 'VND',
      isAvailable: product.isAvailable && product.stock > 0,
      sizePrices: product.sizePrices.map((sp) => ({
        size: sp.size,
        priceAdjustment: Number(sp.priceAdjustment),
      })),
      toppings: toppings.map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price),
      })),
    };
  }
}
