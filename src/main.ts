import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { EmptyBodyFilter } from './common/empty-body.filter';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

const hbs = require('hbs');
const cookieParser = require('cookie-parser');

hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser()); // чтобы читать req.cookies.sessionId

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  hbs.registerPartials(join(__dirname, '..', 'views/partials'));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new EmptyBodyFilter());

  const config = new DocumentBuilder()
    .setTitle('MoneyM API — Сумма дивидендов')
    .setDescription('Акционеры МКПАО «Яндекс». Сессии в Redis, кука sessionId.')
    .setVersion('4.0')
    .addCookieAuth('sessionId')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // http://localhost:3000/api

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();