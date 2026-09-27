import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module.js';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import {register} from "../../shared/src/discovery/discovery.client.js";
import {createLogger} from "../../shared/src/observability/logging.js";
import {createMetricsMiddleware, createMetricsRegistry} from "../../shared/src/observability/metrics.js";

const SERVICE_NAME = 'order-service';
const logger = createLogger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule, { logger });
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

  app.use(createMetricsMiddleware(createMetricsRegistry(SERVICE_NAME)))

  await app.listen(3001);

  await register({
    name: 'order-service',
    url: process.env.SERVICE_URL ?? `http://localhost:3001`
  })
}
await bootstrap();
