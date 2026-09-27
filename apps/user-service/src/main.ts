import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module.js';
import {register} from "../../shared/src/discovery/discovery.client.js";
import {createLogger} from "../../shared/src/observability/logging.js";
import {createMetricsMiddleware, createMetricsRegistry} from "../../shared/src/observability/metrics.js";

const SERVICE_NAME = 'user-service';
const logger = createLogger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule, { logger });
  app.use(createMetricsMiddleware(createMetricsRegistry(SERVICE_NAME)))
  await app.listen(process.env.port ?? 3002);

  await register({
    name: 'user-service',
    url:  process.env.SERVICE_URL ?? `http://localhost:3002`
  })
}
await bootstrap();
