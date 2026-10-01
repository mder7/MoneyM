import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shareholder } from './entities/shareholder.entity';
import { ShareholdersService } from './shareholders.service';
import { ShareholdersController } from './shareholders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shareholder])],
  controllers: [ShareholdersController],
  providers: [ShareholdersService],
})
export class ShareholdersModule {}