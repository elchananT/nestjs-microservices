import { NestFactory } from '@nestjs/core';
import { ProductServiceModule } from './product-service.module.js';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import { dirname, join } from "path";
import {fileURLToPath} from "node:url";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ProductServiceModule, {
      transport: Transport.GRPC,
      options: {
        package: 'product',
        protoPath: join(dirname(fileURLToPath(import.meta.url)), '../../shared/proto/product.proto'),
        url: 'localhost:5001',
      }
  });

  await app.listen()
}
await bootstrap();
