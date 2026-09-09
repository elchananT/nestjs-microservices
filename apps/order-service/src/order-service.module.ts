import {Module} from '@nestjs/common';
import {OrderServiceController} from './order-service.controller.js';
import {OrderServiceService} from './order-service.service.js';
import {HttpModule} from "@nestjs/axios";
import {ClientsModule, Transport} from "@nestjs/microservices";
import {join} from "path";
import {fileURLToPath} from "node:url";
import { dirname } from "node:path";

@Module({
  imports: [
      ClientsModule.register([
        {
          name: 'PRODUCT_SERVICE',
          transport: Transport.GRPC,
          options: {
            package: 'product',
            protoPath: join(dirname(fileURLToPath(import.meta.url)), '../../shared/proto/product.proto'),
            url: 'localhost:5001',
          }
        }
      ]),
      HttpModule,
  ],
  controllers: [OrderServiceController],
  providers: [OrderServiceService],
})
export class OrderServiceModule {}
