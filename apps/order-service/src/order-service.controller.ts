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

    @Get('v1/:id')
    async getV1Response(@Param('id') id: number) {
        const response = await fetch(
            `http://localhost:3000/products/${id}`, {
                headers: {
                    'X-API-Version': '1'
                }
            })

        return {
            productResponse: await response.json()
        }
    }

    @Get('v2/:id')
    async getV2Response(@Param('id') id: number) {
        const response = await fetch(
            `http://localhost:3000/products/${id}`, {
                headers: {
                    'X-API-Version': '2'
                }
            })

        return {
            productResponse: await response.json()
        }
    }

    @Get('header/:id')
    async getHeaderResponse(@Param('id') id: number, @Headers('X-API-Version') version: string) {
        const response = await fetch(
            `http://localhost:3000/products/${id}`, {
                headers: {
                    'X-API-Version': version
                }
            })

        return {
            productResponse: await response.json()
        }
    }

    @Get('query/:id')
    async getQueryResponse(@Param('id') id: number, @Query('version') version: number) {
        const response = await fetch(`http://localhost:3000/products/${id}?version=${version}`)

        return {
            productResponse: await response.json()
        }
    }
}
