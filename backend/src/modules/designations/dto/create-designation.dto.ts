import { IsString, IsBoolean, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionDto {
  @IsString()
  moduleId: string;

  @IsBoolean()
  canView: boolean;

  @IsBoolean()
  canCreate: boolean;

  @IsBoolean()
  canEdit: boolean;

  @IsBoolean()
  canDelete: boolean;

  @IsBoolean()
  @IsOptional()
  canImport?: boolean;

  @IsBoolean()
  @IsOptional()
  canExport?: boolean;

  @IsBoolean()
  @IsOptional()
  canPrint?: boolean;
}

export class CreateDesignationDto {
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
