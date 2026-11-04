import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface SessionData {
  userId: number;
  login: string;
  isAdmin: boolean;
}

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  });
  private readonly ttlSec = 86400;

  constructor() {
    this.redis.on('error', (error: Error) => {
      this.logger.error('Redis session store error', error.stack);
    });
  }

  async create(sessionId: string, data: SessionData): Promise<void> {
    await this.redis.setex(
      `session:${sessionId}`,
      this.ttlSec,
      JSON.stringify(data),
    );
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const raw = await this.redis.get(`session:${sessionId}`);
    return raw === null ? null : (JSON.parse(raw) as SessionData);
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
