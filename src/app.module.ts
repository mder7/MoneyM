import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Shareholder } from './shareholders/entities/shareholder.entity';
import { Like } from './likes/entities/like.entity';
import { ShareholdersModule } from './shareholders/shareholders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [User, Shareholder, Like],
      synchronize: false, // таблицы создаются только миграциями, не автогенерацией
    }),
    ShareholdersModule,
  ],
})
export class AppModule {}