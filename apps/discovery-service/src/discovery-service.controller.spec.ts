import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryServiceController } from './discovery-service.controller.js';
import { DiscoveryServiceService } from './discovery-service.service.js';

describe('DiscoveryServiceController', () => {
  let discoveryServiceController: DiscoveryServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryServiceController],
      providers: [DiscoveryServiceService],
    }).compile();

    discoveryServiceController = app.get<DiscoveryServiceController>(DiscoveryServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(discoveryServiceController.getHello()).toBe('Hello World!');
    });
  });
});
