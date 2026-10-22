import { Controller, Get, Param } from '@nestjs/common';
import { ProductDetailService } from './product-detail.service';

/**
 * GET /api/v1/products/:id (public). Dùng chung prefix `products` với
 * ProductsController (Catalog) nhưng tách file để tránh xung đột code.
 */
@Controller('products')
export class ProductDetailController {
  constructor(private readonly productDetailService: ProductDetailService) {}

  @Get(':id')
  getProductById(@Param('id') id: string) {
    return this.productDetailService.getProductById(id);
  }
}
