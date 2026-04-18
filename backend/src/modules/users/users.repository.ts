import { Injectable, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Histogram } from 'prom-client';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from '../../entities/user.entity.js';
import { METRIC_MYSQL_DURATION } from '../../shared/metrics/metrics.module.js';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectMetric(METRIC_MYSQL_DURATION)
    private readonly mysqlHistogram: Histogram<string>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const end = this.mysqlHistogram.startTimer({ operation: 'create' });
    try {
      const user = this.repo.create(dto);
      return await this.repo.save(user);
    } finally {
      end();
    }
  }

  async findAll(): Promise<User[]> {
    const end = this.mysqlHistogram.startTimer({ operation: 'find_all' });
    try {
      return await this.repo.find({ where: { isActive: true }, take: 100000 });
    } finally {
      end();
    }
  }

  async findById(id: string | ParseIntPipe): Promise<User> {
    const end = this.mysqlHistogram.startTimer({ operation: 'find_by_id' });
    try {
      const integerId = Number(id);
      const user = await this.repo.findOne({ where: { id: integerId } });
      if (!user) throw new NotFoundException(`User ${integerId} not found`);
      return user;
    } finally {
      end();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const end = this.mysqlHistogram.startTimer({ operation: 'find_by_email' });
    try {
      return await this.repo.findOne({ where: { email } });
    } finally {
      end();
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const end = this.mysqlHistogram.startTimer({ operation: 'update' });
    try {
      const user = await this.findById(id);
      Object.assign(user, dto);
      return await this.repo.save(user);
    } finally {
      end();
    }
  }

  async softDelete(id: string): Promise<void> {
    const end = this.mysqlHistogram.startTimer({ operation: 'soft_delete' });
    try {
      await this.findById(id);
      await this.repo.softDelete(id);
    } finally {
      end();
    }
  }
}
