import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { CustomerAuthService } from '../customer-auth.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

/**
 * Guard that verifies the device fingerprint on every request
 * Use this guard AFTER CustomerAuthGuard
 */
@Injectable()
export class CustomerDeviceGuard implements CanActivate {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const deviceFingerprint = request.headers['x-device-fingerprint'] as string;
    const customer = request['customer'];

    if (!customer) {
      throw new UnauthorizedException('Customer authentication required');
    }

    if (!deviceFingerprint) {
      throw new UnauthorizedException('Device fingerprint required');
    }

    // Verify device binding
    const binding = await this.customerAuthService.verifyDeviceBinding(
      customer.customerId,
      deviceFingerprint,
    );

    if (!binding) {
      // Log the failed device verification
      const clientIp = this.getClientIp(request);
      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: customer.customerId,
        action: AuditAction.REJECT,
        newValues: {
          reason: 'device_mismatch_on_request',
          attemptedFingerprint: deviceFingerprint.substring(0, 20) + '...',
        },
        ipAddress: clientIp,
        userAgent: request.headers['user-agent'] as string,
      });

      throw new UnauthorizedException(
        'Device not recognized. This account is locked to a specific device.',
      );
    }

    // Log IP mismatch warning (but don't block)
    const clientIp = this.getClientIp(request);
    if (binding.registeredIp !== clientIp) {
      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: customer.customerId,
        action: AuditAction.UPDATE,
        newValues: {
          warning: 'ip_mismatch_on_request',
          registeredIp: binding.registeredIp,
          currentIp: clientIp,
        },
        ipAddress: clientIp,
        userAgent: request.headers['user-agent'] as string,
      });

      // Attach warning to request for potential UI notification
      request['ipMismatchWarning'] = true;
    }

    return true;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
