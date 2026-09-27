import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module.js';
import {createLogger} from "../../shared/src/observability/logging.js";
import {createMetricsMiddleware, createMetricsRegistry} from "../../shared/src/observability/metrics.js";

const SERVICE_NAME = 'api-gateway';
const logger = createLogger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule, {bodyParser: false, logger });
  app.enableShutdownHooks()

  app.use(createMetricsMiddleware(createMetricsRegistry(SERVICE_NAME)))

  await app.listen(process.env.port ?? 8080);
}
await bootstrap();
