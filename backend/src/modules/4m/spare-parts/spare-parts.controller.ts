import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@ApiTags('spare-parts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all spare parts in catalog' })
  async getAllSpareParts() {
    return this.sparePartsService.getAllSpareParts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get spare part details by ID' })
  async getSparePartById(@Param('id', ParseIntPipe) id: number) {
    return this.sparePartsService.getSparePartById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new spare part in catalog' })
  async createSparePart(@Body() body: any) {
    return this.sparePartsService.createSparePart(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update spare part details by ID' })
  async updateSparePart(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.sparePartsService.updateSparePart(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete spare part by ID' })
  async deleteSparePart(@Param('id', ParseIntPipe) id: number) {
    return this.sparePartsService.deleteSparePart(id);
  }
}
