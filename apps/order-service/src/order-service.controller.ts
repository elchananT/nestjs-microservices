import type {ClientGrpc} from "@nestjs/microservices";
import {Controller, Get, Inject, Param} from "@nestjs/common";
import {firstValueFrom} from "rxjs";

interface ProductService {
    getProduct(data: { id: number }): {
        subscribe: Function;
    }
}

@Controller('orders')
export class OrderServiceController {
    private productService: ProductService;

    constructor(
        @Inject('PRODUCT_SERVICE')
        private readonly grpcClient: ClientGrpc
    ) {}

    onModuleInit() {
        this.productService = this.grpcClient.getService<ProductService>('ProductService');
    }

    @Get('grpc/:id')
    getOrderGrpc(@Param('id') id: number) {
        return this.productService.getProduct({id})
    }


    @Get(':productId')
    async getOrder(@Param('productId') productId: number) {
       const response = await fetch(`http://localhost:3000/products/${productId}`)

       const product = await response.json();

       return {
         orderId: 123,
         product
       }
    }


}
