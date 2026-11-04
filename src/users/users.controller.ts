import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { SessionService } from '../session/session.service';

@ApiTags('Пользователи')
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto): Promise<void> {
    await this.usersService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: RegisterUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.login(dto);
    const sessionId = randomUUID();
    await this.sessions.create(sessionId, {
      userId: user.id,
      login: user.login,
      isAdmin: user.isAdmin,
    });
    response.cookie('sessionId', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400 * 1000,
    });
    return { login: user.login, isAdmin: user.isAdmin };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth('sessionId')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sessionId = request.cookies?.sessionId;
    if (sessionId) {
      await this.sessions.destroy(sessionId);
    }
    response.clearCookie('sessionId');
  }
}
