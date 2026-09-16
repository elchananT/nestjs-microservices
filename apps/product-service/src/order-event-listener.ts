import {Controller, Logger} from "@nestjs/common";
import {EventPattern} from "@nestjs/microservices";

@Controller()
export class OrderEventListener {
    private readonly logger: Logger = new Logger(OrderEventListener.name);

    @EventPattern('order.created')
    handleOrderCreated(
        data: {
            orderId: number,
            productId: number,
        }
    ) {
        this.logger.log(`
        ---------------------------------
        orderId: ${data.orderId}
        productId: ${data.productId}
        ---------------------------------
        `)
    }
}