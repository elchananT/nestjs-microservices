import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module.js';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule, {bodyParser: false});
  app.enableShutdownHooks()

  await app.listen(process.env.port ?? 8080);
}
await bootstrap();
