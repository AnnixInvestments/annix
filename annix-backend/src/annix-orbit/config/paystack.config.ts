import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PaystackConfig {
  secretKey: string;
  publicKey: string | null;
  callbackUrl: string | null;
}

@Injectable()
export class PaystackConfigService {
  constructor(private readonly configService: ConfigService) {}

  secretKey(): string | null {
    return this.configService.get<string>("PAYSTACK_SECRET_KEY") ?? null;
  }

  publicKey(): string | null {
    return this.configService.get<string>("PAYSTACK_PUBLIC_KEY") ?? null;
  }

  callbackUrl(): string | null {
    return this.configService.get<string>("PAYSTACK_CALLBACK_URL") ?? null;
  }

  isConfigured(): boolean {
    return this.secretKey() != null;
  }

  resolved(): PaystackConfig | null {
    const secretKey = this.secretKey();
    if (!secretKey) {
      return null;
    }
    return {
      secretKey,
      publicKey: this.publicKey(),
      callbackUrl: this.callbackUrl(),
    };
  }
}
