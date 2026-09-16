import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import { ProductServiceService } from './product-service.service.js';
import {ProductEvents} from "./product-events.js";

@Controller('products')
export class ProductServiceController {
  constructor(
      private readonly productServiceService: ProductServiceService,
  ) {}

  @Get(':id')
  getHello(@Param('id') id: number) {
    return {
      id: id,
      name: "MacBook Pro",
      price: 1999.99
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
