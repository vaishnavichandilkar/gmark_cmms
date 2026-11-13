import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Notification preferences configuration map' })
  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, any>;

  @ApiPropertyOptional({ description: 'UI display preferences (date format, time format, time zone)' })
  @IsOptional()
  @IsObject()
  uiPreferences?: Record<string, any>;
}

