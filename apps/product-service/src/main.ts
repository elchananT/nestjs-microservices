import { NestFactory } from '@nestjs/core';
import { ProductServiceModule } from './product-service.module.js';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import { dirname, join } from "path";
import {fileURLToPath} from "node:url";
import {register} from "../../shared/discovery/discovery.client.js";

async function bootstrap() {
    const app = await NestFactory.create(ProductServiceModule);
    app.enableShutdownHooks();

        app.connectMicroservice<MicroserviceOptions>({
          transport: Transport.GRPC,
          options: {
            package: 'product',
            protoPath: join(dirname(fileURLToPath(import.meta.url)), '../../shared/proto/product.proto'),
            url: 'localhost:5001',
          }
      });

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
            brokers: ['localhost:9092'],
            clientId: 'product-service',
        },
          consumer: {
            groupId: 'product-service-group',
          }
      }
  });

    await app.startAllMicroservices()

    await app.listen(3000);

    await register({
        name: 'product-service',
        url: `http://localhost:3000`
    })
}
await bootstrap();
