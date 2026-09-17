import { Test, TestingModule } from '@nestjs/testing';
import { ProductServiceController } from './product-service.controller.js';
import { ProductServiceService } from './product-service.service.js';

describe('ProductServiceController', () => {
  let controller: ProductServiceController;
  let service: ProductServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductServiceController],
      providers: [
        {
          provide: ProductServiceService,
          useValue: {
            createProduct: vi.fn().mockResolvedValue({ id: 1, name: 'iPhone', price: 999 }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductServiceController>(ProductServiceController);
    service = module.get<ProductServiceService>(ProductServiceService);
  });

  it('should return product by id', () => {
    const result = controller.getHello(1 as any);
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('name', 'MacBook Pro');
  });

  it('should create product', async () => {
    const result = await controller.createProduct({ name: 'iPhone', price: 999 });
    expect(result).toEqual({ id: 1, name: 'iPhone', price: 999 });
    expect(service.createProduct).toHaveBeenCalledWith({ name: 'iPhone', price: 999 });
  });
});
