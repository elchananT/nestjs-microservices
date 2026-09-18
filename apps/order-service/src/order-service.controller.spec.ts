import { Test, TestingModule } from '@nestjs/testing';
import { OrderServiceController } from './order-service.controller.js';
import { OrderEventProducer } from './order-event-producer.js';

describe('OrderServiceController', () => {
  let controller: OrderServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderServiceController],
      providers: [
        {
          provide: 'PRODUCT_SERVICE',
          useValue: {
            getService: vi.fn(() => ({
              getProduct: vi.fn(() => ({ subscribe: vi.fn() })),
            })),
          },
        },
        {
          provide: OrderEventProducer,
          useValue: {
            publishOrderCreated: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrderServiceController>(OrderServiceController);
  });

  it('should create an order and return it', () => {
    const order = controller.createOrder({ productId: 42 });
    expect(order).toEqual({ orderId: 123, productId: 42 });
  });
});