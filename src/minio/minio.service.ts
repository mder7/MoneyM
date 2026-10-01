import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';

const BUCKET = 'dividends';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly client = new Minio.Client({
    endPoint: process.env.MINIO_HOST || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'admin12345',
  });

  async onModuleInit() {
    const exists = await this.client.bucketExists(BUCKET).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(BUCKET);
    }
  }

  private buildLatinFileName(originalName: string): string {
    const ext = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.'))
      : '';
    return `${randomUUID()}${ext}`;
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const fileName = this.buildLatinFileName(file.originalname);
    await this.client.putObject(
      BUCKET,
      fileName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );
    return fileName;
  }

  getPublicUrl(fileName: string): string {
    const host = process.env.MINIO_PUBLIC_HOST || 'http://localhost:9000';
    return `${host}/${BUCKET}/${fileName}`;
  }
}