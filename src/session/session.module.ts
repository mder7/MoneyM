import { Global, Module } from '@nestjs/common';
import { OptionalSessionGuard, SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Global()
@Module({
  providers: [SessionService, SessionGuard, OptionalSessionGuard],
  exports: [SessionService, SessionGuard, OptionalSessionGuard],
})
export class SessionModule {}
