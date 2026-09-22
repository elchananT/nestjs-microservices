import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module.js';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import {register} from "../../shared/src/discovery/discovery.client.js";

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.enableShutdownHooks();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: process.env.KAFKA_BROKERS?.split(',').map(b => b.trim()) ?? ['localhost:9092'],
        clientId: 'order-service',
      },
      consumer: {
        groupId: 'order-service-group',
      }
    }
  });

  await app.startAllMicroservices()

  await app.listen(3001);

  await register({
    name: 'order-service',
    url: process.env.SERVICE_URL ?? `http://localhost:3001`
  })
}
await bootstrap();
