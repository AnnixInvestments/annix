import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DeepPartial, PersistedEntity } from "../../lib/persistence/crud-repository";
import { servesRealUsers } from "../security/production-security.config";
import { DeviceBindingEntity, DeviceVerificationResult } from "./auth.interfaces";
import type { AuthDeviceBindingRepository } from "./auth-device-binding.repository";

export interface CreateDeviceBindingData<TProfileId extends string> {
  profileId: number;
  profileIdField: TProfileId;
  deviceFingerprint: string;
  registeredIp: string;
  browserInfo?: Record<string, any>;
}

@Injectable()
export class DeviceBindingService {
  constructor(private readonly configService: ConfigService) {}

  isDeviceBindingDisabled(): boolean {
    if (servesRealUsers()) {
      return false;
    }
    return this.configService.get("DISABLE_DEVICE_FINGERPRINT") === "true";
  }

  findPrimaryActiveBinding<T extends DeviceBindingEntity>(bindings: T[] | undefined): T | null {
    if (!bindings) return null;
    return bindings.find((b) => b.isActive && b.isPrimary) ?? null;
  }

  verifyDevice<T extends DeviceBindingEntity>(
    bindings: T[] | undefined,
    fingerprint: string,
    clientIp: string,
  ): DeviceVerificationResult & { ipMismatchWarning: boolean } {
    const activeBinding = this.findPrimaryActiveBinding(bindings);

    if (!activeBinding) {
      return {
        isValid: false,
        binding: null,
        failureReason: "no_binding",
        ipMismatchWarning: false,
      };
    }

    if (activeBinding.deviceFingerprint !== fingerprint) {
      return {
        isValid: false,
        binding: activeBinding,
        failureReason: "fingerprint_mismatch",
        ipMismatchWarning: false,
      };
    }

    const ipMismatchCheckDisabled =
      !servesRealUsers() && this.configService.get("DISABLE_IP_MISMATCH_CHECK") === "true";
    const ipMismatchWarning = !ipMismatchCheckDisabled && activeBinding.registeredIp !== clientIp;

    return {
      isValid: true,
      binding: activeBinding,
      ipMismatchWarning,
    };
  }

  async createBinding<T extends PersistedEntity, TProfileId extends string>(
    repo: AuthDeviceBindingRepository<T>,
    data: CreateDeviceBindingData<TProfileId>,
  ): Promise<T> {
    const bindingData: Record<string, unknown> = {
      [data.profileIdField]: data.profileId,
      deviceFingerprint: data.deviceFingerprint,
      registeredIp: data.registeredIp,
      browserInfo: data.browserInfo,
      isPrimary: true,
      isActive: true,
    };

    return repo.create(bindingData as DeepPartial<T>);
  }

  async findBinding<T extends PersistedEntity>(
    repo: AuthDeviceBindingRepository<T>,
    profileId: number,
    profileIdField: string,
    deviceFingerprint: string,
  ): Promise<T | null> {
    return repo.findActivePrimary(profileIdField, profileId, deviceFingerprint);
  }
}
