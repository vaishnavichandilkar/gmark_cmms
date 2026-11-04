import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class PostalCodesService {
  constructor(private prisma: PrismaService) {}

  async findByPincode(pincode: string) {
    const cleanPin = (pincode || '').trim().replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6) {
      throw new NotFoundException(`Postal code ${pincode} must be a valid 6-digit PIN code`);
    }

    // 1. Check local database cache first
    let postalCode = await this.prisma.postalCode.findUnique({
      where: { pincode: cleanPin },
    });

    if (postalCode) {
      return postalCode;
    }

    // 2. Fetch from Postal Pincode API
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
      if (response.ok) {
        const data: any = await response.json();
        if (
          Array.isArray(data) &&
          data[0] &&
          data[0].Status === 'Success' &&
          Array.isArray(data[0].PostOffice) &&
          data[0].PostOffice.length > 0
        ) {
          const po = data[0].PostOffice[0];
          const city = po.District || po.Block || po.Circle || po.Name || '';
          const state = po.State || '';
          const country = po.Country || 'India';

          // Cache in database so future lookups are immediate
          try {
            postalCode = await this.prisma.postalCode.create({
              data: {
                pincode: cleanPin,
                city,
                state,
                country,
              },
            });
            return postalCode;
          } catch {
            return { pincode: cleanPin, city, state, country };
          }
        }
      }
    } catch (err) {
      console.warn(`Error querying postal API for PIN ${cleanPin}:`, err);
    }

    throw new NotFoundException(`Postal code ${pincode} not found`);
  }
}
