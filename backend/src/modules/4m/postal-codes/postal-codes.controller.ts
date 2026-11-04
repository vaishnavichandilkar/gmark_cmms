import { Controller, Get, Param } from '@nestjs/common';
import { PostalCodesService } from './postal-codes.service';

@Controller('postal-codes')
export class PostalCodesController {
  constructor(private readonly postalCodesService: PostalCodesService) {}

  @Get(':pincode')
  async getByPincode(@Param('pincode') pincode: string) {
    return this.postalCodesService.findByPincode(pincode);
  }
}
