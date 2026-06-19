import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAll(@Query('societyId', ParseIntPipe) societyId: number) {
    return this.usersService.findAllBySociety(societyId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(
    @Body()
    body: {
      username: string;
      mobileNumber: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      profileTitle?: string;
      profileDetail?: string;
      profileImageUrl?: string;
      floorNo?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      role?: string;
      isActive?: boolean;
      societyId: number;
    },
  ) {
    return this.usersService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      username?: string;
      mobileNumber?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      profileTitle?: string;
      profileDetail?: string;
      profileImageUrl?: string;
      floorNo?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      role?: string;
      isActive?: boolean;
    },
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
