import {NestFactory} from '@nestjs/core';
import {ProductServiceModule} from './product-service.module.js';
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import {dirname, join} from "path";
import {fileURLToPath} from "node:url";
import {register} from "../../shared/src/discovery/discovery.client.js";
import {VersioningType} from "@nestjs/common";
import {createLogger} from "../../shared/src/observability/logging.js";
import {createMetricsMiddleware, createMetricsRegistry} from "../../shared/src/observability/metrics.js";

const SERVICE_NAME = 'product-service';
const logger = createLogger(SERVICE_NAME);


async function bootstrap() {
    const app = await NestFactory.create(ProductServiceModule, { logger });
    app.enableShutdownHooks();

        app.connectMicroservice<MicroserviceOptions>({
          transport: Transport.GRPC,
          options: {
            package: 'productV1',
            protoPath: process.env.PROTO_PATH ?? join(dirname(fileURLToPath(import.meta.url)), '../../shared/proto/product-v1.proto'),
            url: process.env.GRPC_URL ?? 'localhost:5001',
          }
      });

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
            brokers: process.env.KAFKA_BROKERS?.split(',').map(b => b.trim()).filter(Boolean) ?? ['localhost:9092'],
            clientId: 'product-service',
        },
          consumer: {
            groupId: 'product-service-group',
          }
      }
  });

    app.enableVersioning({
        type: VersioningType.CUSTOM,
        extractor: (request: any) => request.query.version ?? ''
    })

    app.use(createMetricsMiddleware(createMetricsRegistry('product-service')))

    await app.startAllMicroservices()

    await app.listen(3000);

    await register({
        name: 'product-service',
        url: process.env.SERVICE_URL ?? `http://localhost:3000`
    })
}
await bootstrap();
