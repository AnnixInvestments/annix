import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ComplySaApiKeysService } from "../api-keys.service";

@Injectable()
export class ComplySaApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ComplySaApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = (request.headers["x-api-key"] as string | null) ?? null;

    if (apiKey === null) {
      throw new UnauthorizedException("Missing X-API-Key header");
    }

    const result = await this.apiKeysService.validateKey(apiKey);

    if (result === null) {
      throw new UnauthorizedException("Invalid or expired API key");
    }

    request.company = { id: result.companyId };
    return true;
  }
}
