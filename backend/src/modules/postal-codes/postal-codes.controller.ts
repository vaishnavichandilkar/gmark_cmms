import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PostalCodesService } from './postal-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('postal-codes')
export class PostalCodesController {
  constructor(private readonly postalCodesService: PostalCodesService) {}

  @Get(':pincode')
  async getByPincode(@Param('pincode') pincode: string) {
    return this.postalCodesService.findByPincode(pincode);
  }
}
