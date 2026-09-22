import type {ClientGrpc} from "@nestjs/microservices";
import {Body, Controller, Get, Inject, Param, Post, Headers, Query} from "@nestjs/common";
import {OrderEventProducer} from "./order-event-producer.js";
import {ResilienceService} from "./resilience.service.js";

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
        private readonly grpcClient: ClientGrpc,
        private readonly orderEventProducer: OrderEventProducer,
        private readonly resilienceService: ResilienceService,
    ) {}

    onModuleInit() {
        this.productService = this.grpcClient.getService<ProductService>('ProductService');
    }

    @Post()
    createOrder(@Body() body: { productId: number }) {
        const order = {
            orderId: 123,
            productId: body.productId,
        }

        this.orderEventProducer.publishOrderCreated(order);

        return order;
    }

    @Get('grpc/:id')
    getOrderGrpc(@Param('id') id: number) {
        return this.productService.getProduct({id})
    }


    @Get(':productId')
    async getOrder(@Param('productId') productId: number) {
       const product = await this.resilienceService.getProduct(productId);

       return {
         orderId: 123,
         product
       }
    }

}
