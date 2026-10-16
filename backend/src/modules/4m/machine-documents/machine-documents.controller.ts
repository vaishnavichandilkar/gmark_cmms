import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Ip,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MachineDocumentsService } from './machine-documents.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { BuildingAccessGuard } from '../../core/auth/guards/building-access.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuditLogService } from '../../core/audit-log/audit-log.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@ApiTags('machine-documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, BuildingAccessGuard)
@Controller('machines/:id/documents')
export class MachineDocumentsController {
  constructor(
    private readonly documentsService: MachineDocumentsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async getDocuments(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.getDocumentsForDevice(id);
  }

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
    }),
  )
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const content = `/uploads/${file.filename}`;
    const result = await this.documentsService.addDocument(id, {
      name,
      type: 'File',
      content,
    });
    await this.auditLogService.create(
      user.userId,
      `Document File Uploaded for Machine ID ${id}: ${name}`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Post('link')
  async uploadLink(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
    @Body('url') url: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.documentsService.addDocument(id, {
      name,
      type: 'Link',
      content: url,
    });
    await this.auditLogService.create(
      user.userId,
      `Document Link Added for Machine ID ${id}: ${name}`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Post('note')
  async uploadNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
    @Body('note') note: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.documentsService.addDocument(id, {
      name,
      type: 'Note',
      content: note,
    });
    await this.auditLogService.create(
      user.userId,
      `Document Note Added for Machine ID ${id}: ${name}`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Delete(':docId')
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const result = await this.documentsService.deleteDocument(docId);
    await this.auditLogService.create(
      user.userId,
      `Document Deleted for Machine ID ${id}: ${result.name}`,
      'MACHINES',
      ip,
    );
    return result;
  }

  @Put(':docId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
    }),
  )
  async updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Body('name') name: string,
    @Body('url') url: string,
    @Body('note') note: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (file) updateData.content = `/uploads/${file.filename}`;
    else if (url) updateData.content = url;
    else if (note) updateData.content = note;

    return this.documentsService.updateDocument(docId, updateData);
  }
}
