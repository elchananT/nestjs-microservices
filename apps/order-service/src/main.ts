import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.enableShutdownHooks()
  await app.listen(process.env.port ?? 3001);
}
await bootstrap();
