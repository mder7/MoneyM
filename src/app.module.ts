import { Module } from '@nestjs/common';
import { DividendsModule } from './dividends/dividends.module';

@Module({
  imports: [DividendsModule],
})
export class AppModule {}