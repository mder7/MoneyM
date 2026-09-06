import { Module } from '@nestjs/common';
import { DividendsService } from './dividends.service';
import { DividendsController } from './dividends.controller';

@Module({
  controllers: [DividendsController],
  providers: [DividendsService],
})
export class DividendsModule {}