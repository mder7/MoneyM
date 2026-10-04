import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    return this.usersService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login() {
    return { message: 'Будет реализовано в лабе 4' };
  }

  @Post('logout')
  @HttpCode(200)
  logout() {
    return { message: 'Будет реализовано в лабе 4' };
  }
}