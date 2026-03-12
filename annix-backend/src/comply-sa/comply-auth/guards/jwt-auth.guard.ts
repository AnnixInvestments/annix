import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class ComplySaJwtAuthGuard extends AuthGuard("comply-sa-jwt") {}
