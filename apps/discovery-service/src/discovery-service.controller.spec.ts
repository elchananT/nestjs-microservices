import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryServiceController } from './discovery-service.controller.js';
import { DiscoveryService } from './discovery-service.service.js';

describe('DiscoveryServiceController', () => {
  let controller: DiscoveryServiceController;
  let service: DiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryServiceController],
      providers: [
        {
          provide: DiscoveryService,
          useValue: {
            register: vi.fn((name: string, url: string) => ({ name, url, healthy: true })),
            getService: vi.fn(() => []),
          },
        },
      ],
    }).compile();

    controller = module.get<DiscoveryServiceController>(DiscoveryServiceController);
    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should register a service instance', () => {
    const result = controller.register({ name: 'user-service', url: 'http://localhost:3002' });
    expect(result).toHaveProperty('name', 'user-service');
    expect(result).toHaveProperty('healthy', true);
    expect(service.register).toHaveBeenCalledWith('user-service', 'http://localhost:3002');
  });

  it('should return instances for a service name', () => {
    controller.getService('product-service');
    expect(service.getService).toHaveBeenCalledWith('product-service');
  });
});