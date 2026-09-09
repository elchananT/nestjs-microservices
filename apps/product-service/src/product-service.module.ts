import { Module } from '@nestjs/common';
import { ProductServiceController } from './product-service.controller.js';
import { ProductServiceService } from './product-service.service.js';
import { ProductGrpcController } from './product-grpc.controller.js';

@Module({
  imports: [],
  controllers: [ProductServiceController, ProductGrpcController],
  providers: [ProductServiceService],
})
export class ProductServiceModule {}
