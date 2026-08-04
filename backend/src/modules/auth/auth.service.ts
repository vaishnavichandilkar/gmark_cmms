import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { validatePasswordStrength } from './utils/password.validator';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!validatePasswordStrength(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email or Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        password: hashedPassword,
        role: dto.role || 'VIEWER',
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        societyId: dto.societyId,
      },
    });

    // If building assignments are provided during registration
    if (dto.buildingIds && dto.buildingIds.length > 0) {
      await this.prisma.userBuilding.createMany({
        data: dto.buildingIds.map((buildingId) => ({
          userId: user.id,
          buildingId,
        })),
      });
    }

    return this.sanitizeUser(user);
  }

  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        buildings: true,
        employee: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const buildingIds = user.buildings.map((b) => b.buildingId);
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.societyId,
      buildingIds,
    );
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId: user.id }
    });

    let mergedPermissions: any[] = [];
    if (user.employee?.designation) {
      const designation = await this.prisma.designation.findUnique({
        where: { name: user.employee.designation },
        include: { permissions: true }
      });
      if (designation && designation.permissions) {
        mergedPermissions = [...designation.permissions];
      }
    }

    userPermissions.forEach(up => {
      const index = mergedPermissions.findIndex(p => p.moduleId === up.moduleId);
      if (index >= 0) {
        mergedPermissions[index] = { ...mergedPermissions[index], ...up };
      } else {
        mergedPermissions.push(up);
      }
    });

    const permissions = mergedPermissions.length > 0 ? mergedPermissions : null;

    const sanitizedUser = this.sanitizeUser(user);
    if (permissions) {
      (sanitizedUser as any).permissions = permissions;
    }

    return {
      user: sanitizedUser,
      buildingIds,
      ...tokens,
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { success: true };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: 'HYPN_REFRESH_SECRET_KEY_2026', // Use proper env variables in production
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { buildings: true, employee: true },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Access Denied');
      }

      const isRefreshTokenMatching = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenMatching) {
        throw new UnauthorizedException('Access Denied');
      }

      const buildingIds = user.buildings.map((b) => b.buildingId);
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.societyId,
        buildingIds,
      );
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      const userPermissions = await this.prisma.userPermission.findMany({
        where: { userId: user.id }
      });

      let mergedPermissions: any[] = [];
      if (user.employee?.designation) {
        const designation = await this.prisma.designation.findUnique({
          where: { name: user.employee.designation },
          include: { permissions: true }
        });
        if (designation && designation.permissions) {
          mergedPermissions = [...designation.permissions];
        }
      }

      userPermissions.forEach(up => {
        const index = mergedPermissions.findIndex(p => p.moduleId === up.moduleId);
        if (index >= 0) {
          mergedPermissions[index] = { ...mergedPermissions[index], ...up };
        } else {
          mergedPermissions.push(up);
        }
      });

      const permissions = mergedPermissions.length > 0 ? mergedPermissions : null;

      const sanitizedUser = this.sanitizeUser(user);
      if (permissions) {
        (sanitizedUser as any).permissions = permissions;
      }

      return {
        user: sanitizedUser,
        buildingIds,
        ...tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    if (!validatePasswordStrength(dto.newPassword)) {
      throw new BadRequestException(
        'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // In production, we might want to return success anyway to prevent user enumeration.
      // But for development/integration, let's throw an error or mock return.
      throw new NotFoundException('User with this email does not exist');
    }

    // Generate short-lived reset token (15 mins)
    const resetToken = this.jwtService.sign(
      { email: user.email, action: 'reset-password' },
      { secret: 'HYPN_RESET_SECRET_KEY_2026', expiresIn: '15m' },
    );

    // Mock send reset email -> log to console
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    console.log(`\n========================================`);
    console.log(`[PASSWORD RESET REQUEST] User: ${user.email}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`========================================\n`);

    return {
      success: true,
      message: 'Password reset link generated and logged to console.',
      token: resetToken, // Returned for testing purposes
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token, {
        secret: 'HYPN_RESET_SECRET_KEY_2026',
      });

      if (payload.action !== 'reset-password') {
        throw new BadRequestException('Invalid reset token');
      }

      if (!validatePasswordStrength(dto.newPassword)) {
        throw new BadRequestException(
          'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedNewPassword,
          refreshToken: null, // Revoke active sessions on reset
        },
      });

      return { success: true, message: 'Password reset successfully' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  // --- Helpers ---
  private async generateTokens(
    userId: number,
    email: string,
    role: string,
    societyId: number | null,
    buildingIds: number[],
  ) {
    const payload = {
      userId,
      email,
      role,
      societyId,
      buildingIds,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: 'HYPN_ACCESS_SECRET_KEY_2026', // Use proper env in production
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(
      { userId },
      {
        secret: 'HYPN_REFRESH_SECRET_KEY_2026',
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  private sanitizeUser(user: any) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
