import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class AnnixSentinelJwtAuthGuard extends AuthGuard("annix-sentinel-jwt") {}
