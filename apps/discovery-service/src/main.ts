import { NestFactory } from '@nestjs/core';
import { DiscoveryServiceModule } from './discovery-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(DiscoveryServiceModule);
  await app.listen(3004);
}
await bootstrap();
