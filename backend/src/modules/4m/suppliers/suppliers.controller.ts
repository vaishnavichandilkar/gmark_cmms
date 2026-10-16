import { 
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('suppliers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers with optional search' })
  findAll(@Query('search') search?: string, @CurrentUser() currentUser?: any) {
    return this.suppliersService.findAll({ search }, currentUser);
  }

  @Get('next-code')
  @ApiOperation({ summary: 'Get next auto-generated supplier code' })
  getNextCode() {
    return this.suppliersService.getNextSupplierCode();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  create(@Body() createSupplierDto: CreateSupplierDto, @CurrentUser() currentUser?: any) {
    return this.suppliersService.create(createSupplierDto, currentUser);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier by ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete suppliers with reason' })
  bulkRemove(@Body() body: { ids: number[]; reason?: string }) {
    return this.suppliersService.bulkRemove(body.ids, body.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete supplier by ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.remove(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import suppliers from array (CSV data)' })
  importSuppliers(@Body() suppliersList: CreateSupplierDto[], @CurrentUser() currentUser?: any) {
    return this.suppliersService.importSuppliers(suppliersList, currentUser);
  }
}
