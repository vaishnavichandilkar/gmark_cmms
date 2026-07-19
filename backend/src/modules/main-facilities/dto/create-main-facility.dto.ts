import { IsString, IsNotEmpty, IsOptional, IsLatitude, IsLongitude } from 'class-validator';

export class CreateMainFacilityDto {
  @IsString()
  @IsNotEmpty()
  mainFacilityCode: string;

  @IsString()
  @IsNotEmpty()
  mainFacilityName: string;

  @IsString()
  @IsNotEmpty()
  mainFacilityHead: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  subcategory: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}
