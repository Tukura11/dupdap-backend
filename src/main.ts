import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppConfig } from './config';
import { QueueBoardService } from './queue/queue.board';
import { createBullBoardBasicAuth } from './queue/queue.basic-auth';
import { BULL_BOARD_PATH } from './queue/queue.constants';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);
  const port = config.get<AppConfig['port']>('app.port')!;
  const apiPrefix = config.get<AppConfig['apiPrefix']>('app.apiPrefix')!;

  app.enableCors();
  app.setGlobalPrefix(apiPrefix);

  const queueBoard = app.get(QueueBoardService);
  const credentials = queueBoard.getCredentials();
  app.use(
    BULL_BOARD_PATH,
    createBullBoardBasicAuth(credentials.username, credentials.password),
    queueBoard.getRouter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cheese Backend API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger docs at http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
