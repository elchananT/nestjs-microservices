import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller.js';
import { UserService } from './user-service.service.js';
import {PrismaService} from "./prisma.service.js";
import {HealthController} from "./health.controller.js";
import {JwtModule} from "@nestjs/jwt";
import {ConfigModule, ConfigService} from "@nestjs/config";

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['apps/user-service/.env', '.env']
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
      })
  ],
  controllers: [UserServiceController, HealthController],
  providers: [UserService, PrismaService],
})
export class UserServiceModule {}
