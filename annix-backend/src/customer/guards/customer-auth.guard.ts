import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { CustomerAuthService } from '../customer-auth.service';

export interface CustomerJwtPayload {
  sub: number; // User ID
  customerId: number; // Customer Profile ID
  email: string;
  type: 'customer';
  sessionToken: string;
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customerAuthService: CustomerAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<CustomerJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Verify this is a customer token
      if (payload.type !== 'customer') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still valid
      const session = await this.customerAuthService.verifySession(payload.sessionToken);
      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Attach customer info to request
      request['customer'] = {
        userId: payload.sub,
        customerId: payload.customerId,
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
