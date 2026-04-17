// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';
import 'reflect-metadata';
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

const redis = new Redis({ host: 'localhost', port: 6379 });
redis.set('test_key', 'hello');
redis.get('test_key').then(val => console.log('Redis test:', val)); 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api/v1'); // all routes: /api/v1/users

  await app.listen(process.env.PORT ?? 9002);
  console.log('🚀 Server running on http://localhost:9002/api/v1');
}
bootstrap();
