import { Module } from '@nestjs/common';
import {ProxyModule} from "./proxy/proxy.module.js";
import {ConfigModule, ConfigService} from "@nestjs/config";
import jwtConfig from "../../shared/src/config/jwt.config.js";
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
      ProxyModule
  ],
})
export class ApiGatewayModule {}
