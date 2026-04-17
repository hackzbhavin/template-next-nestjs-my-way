import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Product } from '../entities/product.entity.js';
import { Order } from '../entities/order.entity.js';
import { OrderItem } from '../entities/order-item.entity.js';
import { getRedisConfig } from './redis.config.js';

export const getTypeOrmConfig = (
  config?: ConfigService,
): DataSourceOptions => ({
  type: 'mysql',
  host: config?.get('DB_HOST') ? process.env.DB_HOST : 'localhost',
  port: config?.get<number>('DB_PORT') ? Number(process.env.DB_PORT) : 3306,
  username: config?.get('DB_USER') ? process.env.DB_USER : 'root',
  password: config?.get('DB_PASS') ? process.env.DB_PASS : '',
  database: config?.get('DB_NAME') ? process.env.DB_NAME : 'appdb',
  entities: [User, Product, Order, OrderItem],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  migrationsRun: false,
  logging: true,
  cache: {
    type: 'ioredis',
    options: getRedisConfig(config),
  },
});
