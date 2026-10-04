import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shareholder } from './entities/shareholder.entity';
import { Like } from '../likes/entities/like.entity';
import { ShareholdersService } from './shareholders.service';
import { ShareholdersController } from './shareholders.controller';
import { ShareholdersApiController } from './shareholders-api.controller';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shareholder, Like]), MinioModule],
  controllers: [ShareholdersController, ShareholdersApiController],
  providers: [ShareholdersService],
})
export class ShareholdersModule {}