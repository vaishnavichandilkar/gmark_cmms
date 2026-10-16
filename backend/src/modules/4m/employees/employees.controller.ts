import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto, @CurrentUser() currentUser: any) {
    return this.employeesService.create(createEmployeeDto, currentUser);
  }

  @Get()
  findAll(@CurrentUser() currentUser: any) {
    return this.employeesService.findAll(currentUser);
  }

  @Get('next-code')
  getNextEmployeeCode(@CurrentUser() currentUser: any) {
    return this.employeesService.getNextEmployeeCode(currentUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto, @CurrentUser() currentUser: any) {
    return this.employeesService.update(+id, updateEmployeeDto, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }
}
