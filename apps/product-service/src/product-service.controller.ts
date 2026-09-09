import {Controller, Get, Param} from '@nestjs/common';
import { ProductServiceService } from './product-service.service.js';

@Controller('products')
export class ProductServiceController {
  constructor(private readonly productServiceService: ProductServiceService) {}

  @Get(':id')
  getHello(@Param('id') id: number) {
    return {
      id: id,
      name: "MacBook Pro",
      price: 1999.99
    }
  }
}
