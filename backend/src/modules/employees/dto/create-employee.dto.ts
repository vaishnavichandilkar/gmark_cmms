import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsEmail()
  @IsNotEmpty()
  officialEmail: string;

  @IsEmail()
  @IsOptional()
  personalEmail?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfJoining: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsNumber()
  @IsOptional()
  salaryPayout?: number;

  @IsString()
  @IsNotEmpty()
  role: string;
}
