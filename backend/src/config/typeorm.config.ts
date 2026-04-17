import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';

// Add your entities here as the project grows
const entities = [User];

export const getTypeOrmConfig = (): DataSourceOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME ?? 'myapp',
  entities,
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  migrationsRun: false,
  logging: true,
});
