import {Module} from '@nestjs/common';
import {OrderServiceController} from './order-service.controller.js';
import {OrderServiceService} from './order-service.service.js';
import {HttpModule} from "@nestjs/axios";
import {ClientsModule, Transport} from "@nestjs/microservices";
import {join} from "path";
import {fileURLToPath} from "node:url";
import {dirname} from "node:path";
import {OrderEventProducer} from "./order-event-producer.js";
import { PrismaService } from './prisma.service.js';
import {ProductEventListener} from "./product-event-listener.js";
import {HealthController} from "./health.controller.js";
import {ResilienceService} from "./resilience.service.js";
import {ConfigModule} from "@nestjs/config";
import resilienceConfig from "../../shared/src/config/resilience.config.js";

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['apps/order-service/.env', '.env'],
          load: [resilienceConfig]
      }),
      ClientsModule.register([
        {
          name: 'PRODUCT_SERVICE',
          transport: Transport.GRPC,
          options: {
            package: 'productV1',
            protoPath: join(dirname(fileURLToPath(import.meta.url)), '../../shared/proto/product-v1.proto'),
            url: 'localhost:5001',
          }
        },
        {
            name: 'KAFKA_SERVICE',
            transport: Transport.KAFKA,
            options: {
                client: {
                    brokers: ['localhost:9092'],
                    clientId: 'order-service',
                    allowAutoTopicCreation: true,
                },
                producer: {
                    allowAutoTopicCreation: true,
                }
            }
        }
      ]),
      HttpModule,
  ],
  controllers: [OrderServiceController, ProductEventListener, HealthController],
  providers: [OrderServiceService, OrderEventProducer, PrismaService, ResilienceService],
})
export class OrderServiceModule {}
