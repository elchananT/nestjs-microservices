import {Inject, Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaService} from "./prisma.service.js";
import {ClientKafka} from "@nestjs/microservices";
import {clearInterval} from "node:timers";

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
    private interval: NodeJS.Timeout;

    constructor(
        private readonly prisma: PrismaService,
        @Inject('KAFKA_SERVICE')
        private readonly kafkaClient: ClientKafka
    ) {}

    async onModuleInit() {
        await this.kafkaClient.connect();

        this.interval = setInterval(() => {
            this.relay()
        }, 2000)
    }

    async onModuleDestroy() {
        if (this.interval) {
            clearInterval(this.interval)
        }
    }

    async relay() {
        const events = await this.prisma.outboxEvent.findMany({
            where: {
                status: 'PENDING'
            },
            orderBy: {
                createAt: 'asc'
            },
            take: 10
        })

        for (const event of events) {
            this.kafkaClient.emit(
                event.eventType,
                event.payload
            )

            await this.prisma.outboxEvent.update({
                where: {
                    id: event.id
                },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date()
                }
            })
        }
    }
}
