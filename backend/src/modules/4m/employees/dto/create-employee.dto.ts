import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

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
  @IsOptional()
  officialEmail?: string;

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
  @Min(0, { message: 'Salary payout cannot be negative' })
  @IsOptional()
  salaryPayout?: number;

  @IsString()
  @IsOptional()
  reportingTo?: string;

}
