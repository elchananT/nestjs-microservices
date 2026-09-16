import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module.js';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.enableShutdownHooks();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
        clientId: 'order-service',
      },
      consumer: {
        groupId: 'order-service-group',
      }
    }
  });

  await app.startAllMicroservices()

  await app.listen(3001);
}
await bootstrap();
