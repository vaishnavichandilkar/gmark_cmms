import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SocietiesService } from './societies.service';

@ApiTags('societies')
@Controller('societies')
export class SocietiesController {
  constructor(private readonly societiesService: SocietiesService) { }

  @Get()
  @ApiOperation({ summary: 'Get all societies' })
  @ApiResponse({ status: 200, description: 'Return all societies.' })
  async getSocieties() {
    return this.societiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get society by ID' })
  @ApiParam({ name: 'id', description: 'Society ID' })
  @ApiResponse({ status: 200, description: 'Return society details.' })
  @ApiResponse({ status: 404, description: 'Society not found.' })
  async getSocietyById(@Param('id', ParseIntPipe) id: number) {
    return this.societiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new society' })
  @ApiResponse({ status: 201, description: 'Society created successfully.' })
  async createSociety(@Body() body: { name: string; city: string }) {
    return this.societiesService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing society' })
  @ApiParam({ name: 'id', description: 'Society ID' })
  @ApiResponse({ status: 200, description: 'Society updated successfully.' })
  @ApiResponse({ status: 404, description: 'Society not found.' })
  async updateSociety(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; city: string },
  ) {
    return this.societiesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a society' })
  @ApiParam({ name: 'id', description: 'Society ID' })
  @ApiResponse({ status: 200, description: 'Society deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Society not found.' })
  async deleteSociety(@Param('id', ParseIntPipe) id: number) {
    return this.societiesService.remove(id);
  }
}
