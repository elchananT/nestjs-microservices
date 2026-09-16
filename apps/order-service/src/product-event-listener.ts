import {Controller, Logger} from "@nestjs/common";
import {EventPattern, Payload} from "@nestjs/microservices";
import {PrismaService} from "./prisma.service.js";

@Controller()
export class ProductEventListener {
    constructor(
        private readonly prismaService: PrismaService
    ) {}
    private readonly logger: Logger = new Logger(ProductEventListener.name);

    @EventPattern('product.created')
    async handleProductCreated(@Payload() data: {
        id: number;
        name: string;
        price: number;
    }) {

        return await this.prismaService.productCopy.create({
           data: {
               id: data.id,
               name: data.name,
               price: data.price,
           }
        });
    }


}