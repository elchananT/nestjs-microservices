import { Module } from '@nestjs/common';
import { DiscoveryServiceController } from './discovery-service.controller.js';
import {DiscoveryService} from './discovery-service.service.js';

@Module({
  imports: [],
  controllers: [DiscoveryServiceController],
  providers: [DiscoveryService],
})
export class DiscoveryServiceModule {}
