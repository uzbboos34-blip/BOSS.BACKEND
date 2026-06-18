import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { LoginDto } from "./dto/login-dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: payload.phone },
    });

    if (!user) {
      throw new BadRequestException('Неверный номер телефона или пароль');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Неверный номер телефона или пароль');
    }

    if (user.isBlocked) {
      throw new BadRequestException('Ваш аккаунт заблокирован');
    }
    if (!user.isActive) {
      throw new BadRequestException('Ваш аккаунт не активен');
    }

    const jwtPayload = {
      id: user.id,
      role: user.role,
      superAdminId: user.superAdminId,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as any,
    });

    const refreshToken = await this.jwtService.signAsync(jwtPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return {
      success: true,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      if (user.isBlocked) {
        throw new UnauthorizedException('Ваш аккаунт заблокирован');
      }
      if (!user.isActive) {
        throw new UnauthorizedException('Ваш аккаунт не активен');
      }

      const jwtPayload = {
        id: user.id,
        role: user.role,
        superAdminId: user.superAdminId,
      };

      const newAccessToken = await this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as any,
      });

      return {
        success: true,
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }
}