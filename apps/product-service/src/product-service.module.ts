import { Module } from '@nestjs/common';
import { ProductServiceV1Controller } from './product-service-v1.controller.js';
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
import {ProductServiceV2Controller} from "./product-service-v2.controller.js";
import {ConfigModule} from "@nestjs/config";

@Module({
  imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['apps/product-service/.env']
      }),
      ClientsModule.register([
    {
      name: 'KAFKA_SERVICE',
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: process.env.KAFKA_BROKERS?.split(',').map(b => b.trim()) ?? ['localhost:9092'],
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
  controllers: [ProductServiceV1Controller, ProductGrpcController, OrderEventListener, HealthController, ProductServiceV2Controller],
  providers: [ProductServiceService, PrismaService, ProductEvents, OutboxRelayService],
})
export class ProductServiceModule {}
