import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {ProxyMiddleware} from "./proxy.middleware.js";

@Module({})
export class ProxyModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(ProxyMiddleware)
            .forRoutes('*')
    }
}
