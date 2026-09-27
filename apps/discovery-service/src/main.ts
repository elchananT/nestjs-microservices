import { NestFactory } from '@nestjs/core';
import { DiscoveryServiceModule } from './discovery-service.module.js';
import {createLogger} from "../../shared/src/observability/logging.js";
import {createMetricsMiddleware, createMetricsRegistry} from "../../shared/src/observability/metrics.js";

const SERVICE_NAME = 'discovery-service';
const logger = createLogger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(DiscoveryServiceModule, { logger });
  app.use(createMetricsMiddleware(createMetricsRegistry(SERVICE_NAME)))
  await app.listen(4000);
}
await bootstrap();
