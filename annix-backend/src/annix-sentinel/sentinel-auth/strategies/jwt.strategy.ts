import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { AnnixSentinelProfile } from "../../companies/entities/annix-sentinel-profile.entity";

@Injectable()
export class AnnixSentinelJwtStrategy extends PassportStrategy(Strategy, "annix-sentinel-jwt") {
  constructor(
    configService: ConfigService,
    @InjectRepository(AnnixSentinelProfile)
    private readonly profileRepo: Repository<AnnixSentinelProfile>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.["comply_sa_token"] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: { sub: number; email: string; companyId: number }) {
    const profile = await this.profileRepo.findOne({
      where: { userId: payload.sub },
    });

    return {
      userId: payload.sub,
      email: payload.email,
      companyId: profile?.companyId ?? payload.companyId,
    };
  }
}
