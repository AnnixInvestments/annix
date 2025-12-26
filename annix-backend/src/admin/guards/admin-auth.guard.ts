import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

import { AdminAuthService } from '../admin-auth.service';
import { IS_PUBLIC_KEY } from '../../auth/public.decorator';

export interface AdminJwtPayload {
  sub: number; // User ID
  email: string;
  type: 'admin';
  roles: string[];
  sessionToken: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Verify this is an admin token
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still valid
      const user = await this.adminAuthService.validateSession(payload.sessionToken);
      if (!user) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Attach user info to request
      request['user'] = {
        userId: payload.sub,
        sub: payload.sub,
        email: payload.email,
        roles: payload.roles,
        sessionToken: payload.sessionToken,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
