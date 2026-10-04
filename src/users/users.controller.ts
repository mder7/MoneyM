import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users/register — настоящая регистрация
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    const user = await this.usersService.register(dto);
    return { id: user.id, login: user.login, isAdmin: user.isAdmin };
  }

  // POST /api/users/login — заглушка до лабораторной 4
  @Post('login')
  @HttpCode(200)
  login(): void {}

  // POST /api/users/logout — заглушка до лабораторной 4
  @Post('logout')
  @HttpCode(200)
  logout(): void {}
}
