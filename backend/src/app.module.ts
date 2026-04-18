import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { getRedisConfig } from './config/redis.config.js';
import { getTypeOrmConfig } from './config/typeorm.config.js';
import { UsersModule } from './modules/users/users.module.js';
import { RedisModule } from './shared/redis.module.js';
import { MetricsModule } from './shared/metrics/metrics.module.js';
import { ResponseTimeMiddleware } from './shared/middleware/response-time.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrometheusModule.register(),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: getRedisConfig(config),
      }),
    }),
    RedisModule,
    MetricsModule,
    UsersModule,   // example module — replace or add your own modules here
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ResponseTimeMiddleware).forRoutes('*');
  }
}
