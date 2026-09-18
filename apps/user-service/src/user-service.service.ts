import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {PrismaService} from "./prisma.service.js";
import {JwtService} from "@nestjs/jwt";
import bcrypt from 'bcrypt'

@Injectable()
export class UserService {
  constructor(
      private readonly prisma: PrismaService,
      private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash
      }
    })

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });


    return {
      id: user.id,
      email: user.email,
      token
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      id: user.id,
      token,
    }
  }
}
