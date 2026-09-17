import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import {DiscoveryService} from './discovery-service.service.js';

@Controller('discovery')
export class DiscoveryServiceController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post('register')
  register(@Body() body: {
    name: string,
    url: string,
  }) {
    return this.discoveryService.register(body.name, body.url)
  }

  @Get(':name')
  getService(@Param('name') name: string) {
    return this.discoveryService.getService(name);
  }
}
