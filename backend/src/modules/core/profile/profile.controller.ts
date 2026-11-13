import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  Ip,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller(['api/v1/profile', 'profile'])
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile details returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.userId);
  }

  @Patch('me')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Update personal profile information' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed or forbidden fields submitted.' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
    @Ip() ip: string,
  ) {
    return this.profileService.updateProfile(user.userId, dto, ip);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password.' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ProfileChangePasswordDto,
    @Ip() ip: string,
  ) {
    return this.profileService.changePassword(user.userId, dto, ip);
  }

  @Patch('preferences')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Update user notification and UI preferences' })
  @ApiResponse({ status: 200, description: 'Preferences saved successfully.' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
    @Ip() ip: string,
  ) {
    return this.profileService.updatePreferences(user.userId, dto, ip);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions and device information' })
  @ApiResponse({ status: 200, description: 'Active sessions returned.' })
  async getSessions(
    @CurrentUser() user: any,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    return this.profileService.getActiveSessions(user.userId, ip, userAgent);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/avatars';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files (jpg, jpeg, png, gif, webp) are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile avatar image' })
  @ApiResponse({ status: 200, description: 'Profile avatar image updated.' })
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Ip() ip: string,
  ) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.profileService.updateProfileImage(user.userId, avatarUrl, ip);
  }

  @Post('revoke-other-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of all other active devices/sessions' })
  @ApiResponse({ status: 200, description: 'All other sessions revoked.' })
  async revokeOtherSessions(
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.profileService.revokeOtherSessions(user.userId, ip);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out current user and invalidate active session' })
  @ApiResponse({ status: 200, description: 'Signed out successfully.' })
  async logout(
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    // Increment token version to immediately invalidate current bearer token
    return this.profileService.revokeOtherSessions(user.userId, ip);
  }
}
