import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachinesService } from './machines.service';

@ApiTags('public-machines')
@Controller('public/machines')
export class PublicMachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get('lookup/:codeOrId')
  @ApiOperation({ summary: 'Public machine lookup by machineCode, serialNumber, or ID' })
  async lookupMachine(@Param('codeOrId') codeOrId: string) {
    return this.machinesService.getPublicMachineByCodeOrId(codeOrId);
  }

  @Get(':id/checkpoints')
  @ApiOperation({ summary: 'Public view of machine checkpoints' })
  async getCheckpoints(@Param('id', ParseIntPipe) id: number) {
    return this.machinesService.getPublicMachineCheckpoints(id);
  }
}
