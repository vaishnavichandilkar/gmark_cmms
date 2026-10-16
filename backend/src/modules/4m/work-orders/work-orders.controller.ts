import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads', 'work-orders');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('work-orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post('upload-media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload multi-part photo/video media files' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `wo-media-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async uploadMediaFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploaded = files.map(file => {
      const isVideo = file.mimetype.startsWith('video');
      const isImage = file.mimetype.startsWith('image');
      const fileType = isVideo ? 'VIDEO' : isImage ? 'IMAGE' : 'DOCUMENT';

      return {
        fileName: file.originalname,
        fileUrl: `/uploads/work-orders/${file.filename}`,
        fileType,
        size: file.size,
      };
    });

    return { success: true, files: uploaded };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Work Order' })
  async createWorkOrder(@Body() body: any, @CurrentUser() user: any) {
    return this.workOrdersService.createWorkOrder(body, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all Work Orders with tab and search filters' })
  async getAllWorkOrders(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('tab') tab?: string,
    @Query('machineId') machineId?: number,
    @Query('technicianId') technicianId?: number,
    @Query('search') search?: string,
  ) {
    return this.workOrdersService.getAllWorkOrders({
      status,
      tab,
      machineId,
      technicianId,
      search,
    }, user);
  }

  @Get('check-escalation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Trigger SLA check for overdue unapproved work orders' })
  async checkEscalation() {
    return this.workOrdersService.checkAutoEscalation();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Work Order details by ID' })
  async getWorkOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.workOrdersService.getWorkOrderById(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve Work Order & Assign Technician' })
  async approveWorkOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { technicianId: number; estimatedStartDate?: string; estimatedEndDate?: string; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.approveWorkOrder(id, body, user);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject Work Order with mandatory reason' })
  async rejectWorkOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rejectionReason: string },
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.rejectWorkOrder(id, body, user);
  }

  @Post(':id/escalate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually escalate Work Order to Maintenance Head' })
  async escalateWorkOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { escalatedTo?: string },
  ) {
    return this.workOrdersService.escalateWorkOrder(id, body?.escalatedTo);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Technician complete work order with spare parts & proof media' })
  async completeWorkOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      completionNotes: string;
      sparePartsUsed?: { sparePartId?: number; partName: string; partCode?: string; quantity: number; unitCost: number }[];
      proofMedia?: { fileUrl: string; fileName: string; fileType: string }[];
    },
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.completeWorkOrder(id, body, user);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manager close completed work order' })
  async closeWorkOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.workOrdersService.closeWorkOrder(id, user);
  }

  @Post(':id/request-revision')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Technician request revision on work order' })
  async requestRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string; proposedEstEndDate?: string },
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.requestRevision(id, body, user);
  }

  @Post(':id/revisions/:revisionId/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Maintenance Head approve or reject revision request' })
  async reviewRevision(
    @Param('id', ParseIntPipe) id: number,
    @Param('revisionId', ParseIntPipe) revisionId: number,
    @Body() body: { action: 'APPROVE' | 'REJECT'; remarks?: string },
  ) {
    return this.workOrdersService.reviewRevision(id, revisionId, body);
  }

  @Post(':id/level3-approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Level 3 breakdown review & approval workflow' })
  async level3Approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { technicianId?: number; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.level3ApproveWorkOrder(id, body, user);
  }

  @Post(':id/level3-reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Level 3 breakdown rejection workflow' })
  async level3Reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rejectionReason: string },
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.level3RejectWorkOrder(id, body, user);
  }

  @Get('metrics/historical')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get historical work order metrics across Preventive, Predictive, Condition & Breakdown' })
  async getHistoricalMetrics() {
    return this.workOrdersService.getHistoricalMetrics();
  }
}
