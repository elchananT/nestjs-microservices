import {Inject, Injectable, OnModuleInit} from "@nestjs/common";
import {ClientKafka} from "@nestjs/microservices";

@Injectable()
export class OrderEventProducer implements OnModuleInit {
    constructor(
        @Inject('KAFKA_SERVICE')
        private readonly kafkaClient: ClientKafka
    ) {
    }

    async onModuleInit() {
        await this.kafkaClient.connect();
    }

    publishOrderCreated(
        order: {
            orderId: number,
            productId: number,
        }
    ) {
        this.kafkaClient.emit(
            'order.created',
            order,
        )
    }
}