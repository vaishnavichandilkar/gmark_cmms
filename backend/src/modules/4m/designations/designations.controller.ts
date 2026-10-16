import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('designations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  create(@Body() createDesignationDto: CreateDesignationDto, @CurrentUser() currentUser: any) {
    return this.designationsService.create(createDesignationDto, currentUser);
  }

  @Get()
  findAll(@CurrentUser() currentUser: any) {
    return this.designationsService.findAll(currentUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.designationsService.findOne(id, currentUser);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDesignationDto: UpdateDesignationDto, @CurrentUser() currentUser: any) {
    return this.designationsService.update(+id, updateDesignationDto, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.designationsService.remove(+id, currentUser);
  }
}
