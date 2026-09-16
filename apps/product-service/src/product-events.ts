import {Inject, Injectable} from "@nestjs/common";
import {ClientKafka} from "@nestjs/microservices";

@Injectable()
export class ProductEvents {
    constructor(
        @Inject('KAFKA_SERVICE')
        private readonly kafkaClient: ClientKafka
    ) {
    }

    async onModuleInit() {
        await this.kafkaClient.connect();
    }

    publishProductCreated(
        product: {
            productId: number,
            name: string,
            price: number,
        }
    ) {
        this.kafkaClient.emit(
            'product.created',
            product,
        )
    }


    publishProductUpdated(
        product: {
            productId: number,
            name: string,
            price: number,
        }
    ) {
        this.kafkaClient.emit(
            'product.updated',
            product,
        )
    }
}