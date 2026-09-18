import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller.js';
import { UserService } from './user-service.service.js';
import {PrismaService} from "./prisma.service.js";
import {HealthController} from "./health.controller.js";
import {JwtModule} from "@nestjs/jwt";

@Module({
  imports: [
      JwtModule.register({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: '1h'
        }
      })
  ],
  controllers: [UserServiceController, HealthController],
  providers: [UserService, PrismaService],
})
export class UserServiceModule {}
