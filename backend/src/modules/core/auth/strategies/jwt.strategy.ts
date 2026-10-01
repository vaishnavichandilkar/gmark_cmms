import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'HYPN_ACCESS_SECRET_KEY_2026',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or has been removed.');
    }

    // Invalidate tokens from before the database was reset/re-seeded
    // If the token was issued BEFORE the user was actually created in the DB
    if (payload.iat && (payload.iat * 1000) < user.createdAt.getTime() - 5000) {
      throw new UnauthorizedException('Token is from an older database state.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      societyId: user.societyId,
      mainFacilityId: user.mainFacilityId,
      facilityId: user.facilityId,
      deviceId: user.deviceId,
      deviceName: user.deviceName,
      buildingIds: payload.buildingIds || [],
    };
  }
}
