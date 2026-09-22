import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module.js';
import {register} from "../../shared/src/discovery/discovery.client.js";

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  await app.listen(process.env.port ?? 3002);

  await register({
    name: 'user-service',
    url: `http://localhost:3002`
  })
}
await bootstrap();
