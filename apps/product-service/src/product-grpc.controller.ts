import { Controller } from '@nestjs/common';
import {GrpcMethod} from "@nestjs/microservices";

@Controller()
export class ProductGrpcController {

    @GrpcMethod('ProductService', 'GetProduct')
    getProducts(data: { id: number }) {
        return {
            id: data.id,
            name: 'Product',
            price: 199.99,
        }
    }
}
