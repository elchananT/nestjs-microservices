import {Body, Controller, Get, Param, Post, ServiceUnavailableException} from '@nestjs/common';
import { ProductServiceService } from './product-service.service.js';

@Controller({
  path: 'products',
  version: '1'
})
export class ProductServiceV1Controller {
  constructor(
      private readonly productServiceService: ProductServiceService,
  ) {}

  @Get()
  getProducts()
  {
    return this.productServiceService.getProducts();
  }


  @Get(':id')
  async getProduct(@Param('id') id: number) {
    return {
      version: 'v1',
      serviceVersion: process.env.SERVICE_VERSION ?? 'unknown',
      id,
      name: "MacBook Pro",
      price: 1999.99,
    }
  }


  @Post()
  async createProduct(@Body() product: {
    name: string,
    price: number,
  }) {
    return await this.productServiceService.createProduct(product);
  }
}
