import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsGSTIN } from '../../../../common/validators/is-gstin.validator';

export class CompanyDetailsDto {
  @ApiProperty({ example: 'ABC Industries' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter company name.' })
  companyName: string;

  @ApiProperty({ example: 'Manufacturing' })
  @IsString()
  @IsNotEmpty({ message: 'Please select business category.' })
  businessCategory: string;

  @ApiProperty({ example: '27AAPFU0939F1ZV' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter a valid GST number.' })
  @IsGSTIN()
  gstNumber: string;

  @ApiProperty({ example: '123 Business Address' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter complete company address.' })
  address: string;

  @ApiProperty({ example: '411018' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter a valid postal code.' })
  postalCode: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter city.' })
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter state.' })
  state: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @IsNotEmpty({ message: 'Please select country.' })
  country: string;
}

export class PersonalDetailsDto {
  @ApiProperty({ example: 'User Name' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your full name.' })
  fullName: string;

  @ApiProperty({ example: 'Director' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your designation.' })
  designation: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Please enter a valid email address.' })
  email: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter a valid phone number.' })
  phoneNumber: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.VIEWER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 4, required: false })
  @IsInt()
  @IsOptional()
  societyId?: number;

  @ApiProperty({ type: [Number], required: false })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  buildingIds?: number[];

  @ApiProperty({ example: 'BOTH', required: false })
  @IsString()
  @IsOptional()
  moduleAccess?: string;
}

export class UpdateModuleAccessDto {
  @ApiProperty({ example: 'CMMS' })
  @IsString()
  @IsNotEmpty()
  moduleAccess: string;
}

export class SignupDto {
  @ApiProperty({ example: 'BOTH', required: false })
  @IsString()
  @IsOptional()
  moduleAccess?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyDetailsDto)
  company?: CompanyDetailsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  personal?: PersonalDetailsDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessCategory?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  workEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  termsAccepted?: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'superadmin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'superadmin@hypn.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
