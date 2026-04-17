import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { getTypeOrmConfig } from './config/typeorm.config.js';

config();

export const AppDataSource = new DataSource(getTypeOrmConfig());
