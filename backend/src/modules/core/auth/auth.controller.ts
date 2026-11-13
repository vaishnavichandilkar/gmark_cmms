import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  SignupDto,
  UpdateModuleAccessDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('check-gst')
  @ApiOperation({ summary: 'Check if GST number is available for registration' })
  async checkGst(@Query('gstNumber') gstNumber: string) {
    return this.authService.checkGstAvailability(gstNumber);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or user already exists.',
  })
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    const user = await this.authService.register(dto);
    await this.auditLogService.create(
      user.id,
      `User registered: ${user.email}`,
      'AUTH',
      ip,
    );
    return user;
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new admin and main facility' })
  @ApiResponse({ status: 201, description: 'Admin successfully signed up.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or user already exists.',
  })
  async signup(@Body() dto: SignupDto, @Ip() ip: string) {
    const result = await this.authService.signup(dto);
    await this.auditLogService.create(
      result.user.id,
      `Admin signed up: ${result.user.email}`,
      'AUTH',
      ip,
    );
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const result = await this.authService.login(dto, ip);
    await this.auditLogService.create(
      result.user.id,
      `User logged in`,
      'AUTH',
      ip,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
  async logout(@CurrentUser() user: any, @Ip() ip: string) {
    await this.authService.logout(user.userId);
    await this.auditLogService.create(
      user.userId,
      `User logged out`,
      'AUTH',
      ip,
    );
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT access token using a refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and resolved permissions' })
  @ApiResponse({ status: 200, description: 'Current user profile with permissions.' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('module-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update module access subscription (CMMS, IOT, BOTH)' })
  @ApiResponse({ status: 200, description: 'Module access updated successfully.' })
  async updateModuleAccess(
    @CurrentUser() user: any,
    @Body() dto: UpdateModuleAccessDto,
    @Ip() ip: string,
  ) {
    const result = await this.authService.updateModuleAccess(user.userId, dto.moduleAccess);
    await this.auditLogService.create(
      user.userId,
      `User updated module access to ${dto.moduleAccess}`,
      'AUTH',
      ip,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Incorrect current password or weak new password.',
  })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
  ) {
    const result = await this.authService.changePassword(user.userId, dto);
    await this.auditLogService.create(
      user.userId,
      `User changed password`,
      'AUTH',
      ip,
    );
    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, description: 'Reset link generated.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    const result = await this.authService.forgotPassword(dto);
    // Log without real userId if forgot password, search for user to find ID or default to 0
    await this.auditLogService.create(
      0,
      `Forgot password requested for: ${dto.email}`,
      'AUTH',
      ip,
    );
    return result;
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    const result = await this.authService.resetPassword(dto);
    await this.auditLogService.create(
      0,
      `Password reset successful via token`,
      'AUTH',
      ip,
    );
    return result;
  }
}
