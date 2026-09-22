import { Test, TestingModule } from '@nestjs/testing';
import { ProductServiceV1Controller } from './product-service-v1.controller.js';
import { ProductServiceService } from './product-service.service.js';

describe('ProductServiceV1Controller', () => {
  let controller: ProductServiceV1Controller;
  let service: ProductServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductServiceV1Controller],
      providers: [
        {
          provide: ProductServiceService,
          useValue: {
            createProduct: vi.fn().mockResolvedValue({ id: 1, name: 'iPhone', price: 999 }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductServiceV1Controller>(ProductServiceV1Controller);
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
