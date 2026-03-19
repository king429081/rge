import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix('api');

  // Use WebSocket adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(3001);
  console.log(`NestJS Backend running on http://localhost:3001`);
}
bootstrap();
