import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getTypeOrmConfig } from './config/typeorm.config';

export const AppDataSource = new DataSource(getTypeOrmConfig());
