import {BadRequestException, Body, Controller, Get, Post} from '@nestjs/common';
import { UserService } from './user-service.service.js';

@Controller('auth')
export class UserServiceController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() body: { email: string, password: string }) {
    if (typeof body?.email !== 'string' || typeof body?.password !== 'string' || !body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.userService.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string, password: string }) {
    if (typeof body?.email !== 'string' || typeof body?.password !== 'string' || !body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.userService.login(body.email, body.password);
  }
}
