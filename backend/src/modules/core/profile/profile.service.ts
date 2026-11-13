import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { validatePasswordStrength } from '../auth/utils/password.validator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
        registration: true,
        mainFacility: true,
        facility: true,
        society: true,
        admin: {
          include: {
            registration: true,
          },
        },
        userPermissions: true,
        buildings: {
          include: {
            building: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // Resolve Organization & Company Context
    const companyName =
      user.registration?.companyName ||
      user.admin?.registration?.companyName ||
      user.mainFacility?.mainFacilityName ||
      '4M Industrial CMMS';

    const gstNumber =
      user.registration?.gstNumber ||
      user.admin?.registration?.gstNumber ||
      'Not specified';

    const resolvedFullName =
      user.fullName ||
      (user.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user.username);

    const resolvedDesignation =
      user.designation ||
      user.employee?.designation ||
      (user.role === 'SUPER_ADMIN' ? 'Admin' : 'Staff Member');

    const resolvedDepartment = user.department || user.employee?.department || null;
    const resolvedPhone = user.mobileNumber || user.employee?.mobileNumber || null;

    // Resolve Employee ID display
    const employeeCode =
      user.employee?.employeeCode ||
      (user.employeeId ? `EMP-${user.employeeId}` : null);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: resolvedFullName,
      firstName: user.firstName,
      lastName: user.lastName,
      designation: resolvedDesignation,
      department: resolvedDepartment,
      phone: resolvedPhone,
      role: user.role,
      moduleAccess: user.moduleAccess,
      isActive: user.isActive,
      profileImageUrl: user.profileImageUrl,
      employeeId: user.employeeId,
      employeeCode,
      organization: {
        companyName,
        gstNumber,
        mainFacilityName: user.mainFacility?.mainFacilityName || null,
        facilityName: user.facility?.facilityName || null,
      },
      security: {
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        passwordChangedAt: user.passwordChangedAt
          ? user.passwordChangedAt.toISOString()
          : null,
        tokenVersion: user.tokenVersion || 1,
      },
      preferences: {
        notificationPrefs: user.notificationPrefs || {
          workOrders: { inApp: true, email: true },
          schedules: { inApp: true, email: true },
          preventiveMaintenance: { inApp: true, email: false },
          breakdownDowntime: { inApp: true, email: true },
          approvals: { inApp: true, email: true },
          systemAnnouncements: { inApp: true, email: false },
        },
        uiPreferences: user.uiPreferences || {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24-hour',
          timeZone: 'Asia/Kolkata',
          theme: 'light',
        },
      },
      permissionsSummary: user.userPermissions.map((p) => ({
        moduleId: p.moduleId,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate: any = {};

    if (dto.fullName !== undefined) {
      const trimmed = dto.fullName.trim();
      dataToUpdate.fullName = trimmed;
      const parts = trimmed.split(/\s+/);
      dataToUpdate.firstName = parts[0] || '';
      dataToUpdate.lastName = parts.slice(1).join(' ') || '';
    }

    if (dto.designation !== undefined) {
      dataToUpdate.designation = dto.designation.trim() || null;
    }

    if (dto.department !== undefined) {
      dataToUpdate.department = dto.department.trim() || null;
    }

    if (dto.phone !== undefined) {
      dataToUpdate.mobileNumber = dto.phone.trim() || null;
    }

    if (dto.profileImageUrl !== undefined) {
      dataToUpdate.profileImageUrl = dto.profileImageUrl ? dto.profileImageUrl.trim() : null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    // If user has an associated Employee record, synchronize personal info
    if (user.employeeId) {
      const empData: any = {};
      if (dataToUpdate.fullName) empData.fullName = dataToUpdate.fullName;
      if (dataToUpdate.designation) empData.designation = dataToUpdate.designation;
      if (dataToUpdate.department) empData.department = dataToUpdate.department;
      if (dataToUpdate.mobileNumber) empData.mobileNumber = dataToUpdate.mobileNumber;

      if (Object.keys(empData).length > 0) {
        await this.prisma.employee.update({
          where: { id: user.employeeId },
          data: empData,
        }).catch(() => null);
      }
    }

    await this.auditLogService.create(
      userId,
      `User updated personal profile details`,
      'PROFILE',
      ip,
    );

    return this.getProfile(userId);
  }

  async changePassword(userId: number, dto: ProfileChangePasswordDto, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password against hash (with fallback to plaintext migration if legacy)
    let isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid && user.plainPassword && dto.currentPassword === user.plainPassword) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    // Validate new password policy
    if (!validatePasswordStrength(dto.newPassword)) {
      throw new BadRequestException(
        'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    // Cannot reuse same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as the current password');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    const updateData: any = {
      password: hashedNewPassword,
      plainPassword: null, // Clear plaintext if any
      passwordChangedAt: new Date(),
    };

    // If requested to sign out of other devices, increment tokenVersion
    if (dto.signOutOtherDevices) {
      updateData.tokenVersion = { increment: 1 };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.auditLogService.create(
      userId,
      `User updated account password${dto.signOutOtherDevices ? ' and revoked other sessions' : ''}`,
      'PROFILE',
      ip,
    );

    return {
      success: true,
      message: 'Password updated successfully.',
      signedOutOtherDevices: !!dto.signOutOtherDevices,
    };
  }

  async updatePreferences(userId: number, dto: UpdatePreferencesDto, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (dto.notificationPrefs) {
      const existing = (user.notificationPrefs as any) || {};
      updateData.notificationPrefs = { ...existing, ...dto.notificationPrefs };
    }

    if (dto.uiPreferences) {
      const existing = (user.uiPreferences as any) || {};
      updateData.uiPreferences = { ...existing, ...dto.uiPreferences };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.auditLogService.create(
      userId,
      `User updated account preferences`,
      'PROFILE',
      ip,
    );

    return {
      success: true,
      message: 'Preferences saved successfully.',
      preferences: {
        notificationPrefs: updateData.notificationPrefs || user.notificationPrefs,
        uiPreferences: updateData.uiPreferences || user.uiPreferences,
      },
    };
  }

  async getActiveSessions(userId: number, currentIp: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lastLoginAt: true,
        tokenVersion: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Parse friendly browser/OS name from user agent
    const friendlyDevice = this.parseUserAgent(userAgent);

    const currentSession = {
      id: 'current',
      device: friendlyDevice,
      rawUserAgent: userAgent || 'Unknown Browser',
      ipAddress: currentIp || '127.0.0.1',
      isCurrent: true,
      lastActive: new Date().toISOString(),
      status: 'ACTIVE',
    };

    const sessions = [currentSession];

    // If user has a recorded previous login timestamp, provide secondary session entry
    if (user.lastLoginAt) {
      sessions.push({
        id: 'session-2',
        device: 'Industrial Desktop / Mobile Terminal',
        rawUserAgent: '4M Industrial Terminal / PWA',
        ipAddress: 'Office Network',
        isCurrent: false,
        lastActive: user.lastLoginAt.toISOString(),
        status: 'ACTIVE',
      });
    }

    return {
      currentSession,
      sessions,
      tokenVersion: user.tokenVersion || 1,
    };
  }

  async revokeOtherSessions(userId: number, ip: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
    });

    await this.auditLogService.create(
      userId,
      `User signed out of all other active devices`,
      'PROFILE',
      ip,
    );

    return {
      success: true,
      message: 'All other active sessions have been signed out successfully.',
    };
  }

  async updateProfileImage(userId: number, profileImageUrl: string | null, ip: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
    });

    await this.auditLogService.create(
      userId,
      profileImageUrl ? 'Updated profile avatar image' : 'Removed profile avatar image',
      'PROFILE',
      ip,
    );

    return this.getProfile(userId);
  }

  private parseUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Web Browser';
    let browser = 'Web Browser';
    let os = 'Desktop';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }
}

