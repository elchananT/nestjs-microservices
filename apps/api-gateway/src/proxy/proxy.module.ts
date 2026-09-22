import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {ProxyMiddleware} from "./proxy.middleware.js";
import {AuthMiddleware} from "../auth/auth.middleware.js";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {JwtModule} from "@nestjs/jwt";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env'],
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: '1h',
                }
            })
        }),
    ]
})
export class ProxyModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes('*')
            .apply(ProxyMiddleware)
            .forRoutes('*')
    }
}
