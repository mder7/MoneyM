import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface SessionRequest extends Request {
  userId?: number | null;
}

export const UserId = createParamDecorator(
  (_: unknown, context: ExecutionContext): number | null =>
    context.switchToHttp().getRequest<SessionRequest>().userId ?? null,
);
