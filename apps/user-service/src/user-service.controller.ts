import {Body, Controller, Get, Post} from '@nestjs/common';
import { UserService } from './user-service.service.js';

@Controller('auth')
export class UserServiceController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() body: { email: string, password: string }) {
    return this.userService.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string, password: string }) {
    return this.userService.login(body.email, body.password);
  }
}
