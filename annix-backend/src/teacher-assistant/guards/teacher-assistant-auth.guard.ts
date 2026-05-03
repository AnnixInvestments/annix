import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { TeacherAssistantAuthService } from "../services/teacher-assistant-auth.service";

export interface TeacherAssistantRequest extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    schoolName: string | null;
  };
}

@Injectable()
export class TeacherAssistantAuthGuard implements CanActivate {
  constructor(private readonly authService: TeacherAssistantAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header.");
    }
    const token = authHeader.substring(7);
    try {
      const payload = this.authService.verifyToken(token);
      if (payload.type !== "teacher-assistant") {
        throw new UnauthorizedException("Invalid token type.");
      }
      const user = await this.authService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found.");
      }
      (request as TeacherAssistantRequest).user = {
        id: user.id,
        email: user.email,
        name: user.name,
        schoolName: user.schoolName,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }
}
