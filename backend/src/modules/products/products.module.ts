import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductDetailController } from './product-detail.controller';
import { ProductDetailService } from './product-detail.service';

@Module({
  controllers: [ProductsController, ProductDetailController],
  providers: [ProductsService, ProductDetailService],
  exports: [ProductsService, ProductDetailService],
})
export class ProductsModule {}
