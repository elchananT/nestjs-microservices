import { Test, TestingModule } from '@nestjs/testing';
import { UserServiceController } from './user-service.controller.js';
import { UserService } from './user-service.service.js';

describe('UserServiceController', () => {
  let userServiceController: UserServiceController;

  const register = vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com' });
  const login = vi.fn().mockResolvedValue({ access_token: 'token-123' });

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserServiceController],
      providers: [
        {
          provide: UserService,
          useValue: { register, login },
        },
      ],
    }).compile();

    userServiceController = app.get<UserServiceController>(UserServiceController);
  });

  describe('register', () => {
    it('delegates to the user service', async () => {
      await expect(userServiceController.register({ email: 'a@b.com', password: 'pw' })).resolves.toEqual({
        id: 1,
        email: 'a@b.com',
      });
      expect(register).toHaveBeenCalledWith('a@b.com', 'pw');
    });
  });

  describe('login', () => {
    it('delegates to the user service', async () => {
      await expect(userServiceController.login({ email: 'a@b.com', password: 'pw' })).resolves.toEqual({
        access_token: 'token-123',
      });
      expect(login).toHaveBeenCalledWith('a@b.com', 'pw');
    });
  });
});