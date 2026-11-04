import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from './session.service';

interface SessionRequest extends Request {
  userId?: number | null;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const sessionId = request.cookies?.sessionId;
    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const session = await this.sessions.get(sessionId);
    if (!session) {
      throw new UnauthorizedException();
    }

    request.userId = session.userId;
    return true;
  }
}

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const sessionId = request.cookies?.sessionId;
    const session = sessionId ? await this.sessions.get(sessionId) : null;
    request.userId = session?.userId ?? null;
    return true;
  }
}
