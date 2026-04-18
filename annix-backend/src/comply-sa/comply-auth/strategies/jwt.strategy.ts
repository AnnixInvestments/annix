import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { ComplySaProfile } from "../../companies/entities/comply-sa-profile.entity";

@Injectable()
export class ComplySaJwtStrategy extends PassportStrategy(Strategy, "comply-sa-jwt") {
  constructor(
    configService: ConfigService,
    @InjectRepository(ComplySaProfile)
    private readonly profileRepo: Repository<ComplySaProfile>,
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
