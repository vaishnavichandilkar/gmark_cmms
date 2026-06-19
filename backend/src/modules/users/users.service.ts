import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomBytes, pbkdf2Sync } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  async findAllBySociety(societyId: number) {
    return this.prisma.user.findMany({
      where: { societyId },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(data: {
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
  }) {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException(`User with email ${data.email} already exists`);
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw new BadRequestException(`User with username ${data.username} already exists`);
    }

    const hashedPassword = this.hashPassword(data.password);

    return this.prisma.user.create({
      data: {
        username: data.username,
        mobileNumber: data.mobileNumber,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        profileTitle: data.profileTitle || null,
        profileDetail: data.profileDetail || null,
        profileImageUrl: data.profileImageUrl || null,
        floorNo: data.floorNo || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        pincode: data.pincode || null,
        role: data.role || 'COMMUNITY_USER',
        isActive: data.isActive !== undefined ? data.isActive : true,
        societyId: data.societyId,
      },
    });
  }

  async update(
    id: number,
    data: {
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
    await this.findOne(id);

    const updateData: any = { ...data };

    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`User with email ${data.email} already exists`);
      }
    }

    if (data.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`User with username ${data.username} already exists`);
      }
    }

    if (data.password) {
      updateData.password = this.hashPassword(data.password);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
