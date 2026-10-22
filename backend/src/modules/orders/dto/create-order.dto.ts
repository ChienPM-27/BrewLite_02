import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductSize } from '@prisma/client';

export class CreateOrderItemDto {
  @IsDefined()
  @IsString()
  productId: string;

  @IsOptional()
  @IsEnum(ProductSize)
  size: ProductSize = ProductSize.M;

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  toppingIds: string[] = [];
}

export class CreateOrderDto {
  @IsDefined()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  promotionCode?: string;
}
