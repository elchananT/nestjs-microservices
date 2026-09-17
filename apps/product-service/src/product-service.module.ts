import { Module } from '@nestjs/common';
import { ProductServiceController } from './product-service.controller.js';
import { ProductServiceService } from './product-service.service.js';
import { ProductGrpcController } from './product-grpc.controller.js';
import {OrderEventListener} from "./order-event-listener.js";
import { PrismaService } from './prisma.service.js';
import {ProductEvents} from "./product-events.js";
import {ClientsModule, Transport} from "@nestjs/microservices";
import {join} from "path";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {HttpModule} from "@nestjs/axios";
import { OutboxRelayService } from './outbox-relay.service.js';
import {HealthController} from "./health.controller.js";

@Module({
  imports: [ClientsModule.register([
    {
      name: 'KAFKA_SERVICE',
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
          clientId: 'product-service',
          allowAutoTopicCreation: true,
        },
        producer: {
          allowAutoTopicCreation: true,
        }
      }
    }
  ])
  ],
  controllers: [ProductServiceController, ProductGrpcController, OrderEventListener, HealthController],
  providers: [ProductServiceService, PrismaService, ProductEvents, OutboxRelayService],
})
export class ProductServiceModule {}
