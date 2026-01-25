import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RemoteAccessFeatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const isEnabled = this.configService.get('ENABLE_REMOTE_ACCESS') === 'true';

    if (!isEnabled) {
      return true;
    }

    return true;
  }

  isFeatureEnabled(): boolean {
    return this.configService.get('ENABLE_REMOTE_ACCESS') === 'true';
  }
}
