import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { SupplierAuthService } from '../supplier-auth.service';

export interface SupplierJwtPayload {
  sub: number; // User ID
  supplierId: number; // Supplier Profile ID
  email: string;
  type: 'supplier';
  sessionToken: string;
}

@Injectable()
export class SupplierAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly supplierAuthService: SupplierAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<SupplierJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Verify this is a supplier token
      if (payload.type !== 'supplier') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still valid
      const session = await this.supplierAuthService.verifySession(payload.sessionToken);
      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Attach supplier info to request
      request['supplier'] = {
        userId: payload.sub,
        supplierId: payload.supplierId,
        email: payload.email,
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
