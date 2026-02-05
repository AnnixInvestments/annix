import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { AdminAuthService } from '../../admin/admin-auth.service';
import { CustomerAuthService } from '../../customer/customer-auth.service';
import { SupplierAuthService } from '../../supplier/supplier-auth.service';

export interface AnyUserJwtPayload {
  sub: number;
  email: string;
  type: 'admin' | 'customer' | 'supplier';
  sessionToken: string;
  customerId?: number;
  supplierId?: number;
  roles?: string[];
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  type: 'admin' | 'customer' | 'supplier';
  customerId?: number;
  supplierId?: number;
  roles?: string[];
}

@Injectable()
export class AnyUserAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
    private readonly customerAuthService: CustomerAuthService,
    private readonly supplierAuthService: SupplierAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AnyUserJwtPayload>(
        token,
        {
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      );

      const authUser = await this.validateSessionByType(payload);
      request['authUser'] = authUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async validateSessionByType(
    payload: AnyUserJwtPayload,
  ): Promise<AuthenticatedUser> {
    if (payload.type === 'admin') {
      const user = await this.adminAuthService.validateSession(
        payload.sessionToken,
      );
      if (!user) {
        throw new UnauthorizedException('Session expired or invalid');
      }
      return {
        userId: payload.sub,
        email: payload.email,
        type: 'admin',
        roles: user.roles?.map((r) => r.name) || [],
      };
    }

    if (payload.type === 'customer') {
      const session = await this.customerAuthService.verifySession(
        payload.sessionToken,
      );
      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }
      return {
        userId: payload.sub,
        email: payload.email,
        type: 'customer',
        customerId: payload.customerId,
      };
    }

    if (payload.type === 'supplier') {
      const session = await this.supplierAuthService.verifySession(
        payload.sessionToken,
      );
      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }
      return {
        userId: payload.sub,
        email: payload.email,
        type: 'supplier',
        supplierId: payload.supplierId,
      };
    }

    throw new UnauthorizedException('Invalid token type');
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
