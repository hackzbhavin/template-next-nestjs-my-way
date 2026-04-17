// src/users/users.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from 'src/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.usersRepo.create({ ...dto, password: hashed });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.findAll();
  }

  async findById(id: string): Promise<User> {
    return this.usersRepo.findById(id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    return this.usersRepo.update(id, dto);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.usersRepo.softDelete(id);
    return { message: `User ${id} deactivated successfully` };
  }
}
