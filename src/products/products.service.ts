import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/common/dtp/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({ data: createProductDto });
    return product;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const currentPage = page;
    const totalProducts = await this.prisma.product.count({ where: { available: true } });
    const totalPages = Math.ceil(totalProducts / limit);

    const data = await this.prisma.product.findMany({ skip, take: limit, where: { available: true } });

    return {
      data,
      meta: {
        totalProducts,
        totalPages,
        currentPage,
        limit,
      }
    }
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return await this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    //return await this.prisma.product.delete({ where: { id } });
    return await this.prisma.product.update({ where: { id }, data: { available: false } });
  }
}
