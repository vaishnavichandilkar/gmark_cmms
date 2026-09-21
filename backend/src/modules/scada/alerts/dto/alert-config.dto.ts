import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class UpsertAlertConfigDto {
  @IsNumber()
  registerNumber: number;

  @IsOptional()
  @IsString()
  registerName?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['EMERGENCY', 'WARNING', 'NOTIFY'])
  alertType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  intensity?: number;

  @IsString()
  @IsIn(['GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'NOT_EQUAL_TO', 'GTE', 'LTE'])
  conditionType: string;

  @IsNumber()
  conditionValue: number;

  @IsString()
  message: string;
}
