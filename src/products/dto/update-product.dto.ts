import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsBoolean, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto extends PartialType(CreateProductDto) {
    @IsBoolean()
    @IsOptional()
    public available?: boolean;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    id: number
}
