import { PartialType } from '@nestjs/mapped-types';
import { CreateMainFacilityDto } from './create-main-facility.dto';

export class UpdateMainFacilityDto extends PartialType(CreateMainFacilityDto) {}
