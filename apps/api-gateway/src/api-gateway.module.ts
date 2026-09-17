import { Module } from '@nestjs/common';
import {ProxyModule} from "./proxy/proxy.module.js";

@Module({
  imports: [ProxyModule],
})
export class ApiGatewayModule {}
