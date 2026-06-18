import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { fromJSDate, now } from "../lib/datetime";
import { AnnixSentinelApiKeyRepository } from "./api-key.repository";

@Injectable()
export class AnnixSentinelApiKeysService {
  constructor(private readonly apiKeyRepository: AnnixSentinelApiKeyRepository) {}

  async generateKey(companyId: number, name: string): Promise<{ key: string; id: number }> {
    const plainKey = `ac_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(plainKey).digest("hex");

    const saved = await this.apiKeyRepository.create({
      companyId,
      keyHash,
      name,
      active: true,
    });

    return { key: plainKey, id: saved.id };
  }

  async validateKey(plainKey: string): Promise<{ companyId: number } | null> {
    const keyHash = createHash("sha256").update(plainKey).digest("hex");

    const apiKey = await this.apiKeyRepository.findActiveByKeyHash(keyHash);

    if (apiKey === null) {
      return null;
    }

    if (apiKey.expiresAt !== null && fromJSDate(apiKey.expiresAt) < now()) {
      return null;
    }

    apiKey.lastUsedAt = now().toJSDate();
    await this.apiKeyRepository.save(apiKey);

    return { companyId: apiKey.companyId };
  }

  async listKeys(companyId: number): Promise<
    Array<{
      id: number;
      name: string;
      lastUsedAt: Date | null;
      active: boolean;
      expiresAt: Date | null;
      createdAt: Date;
    }>
  > {
    const keys = await this.apiKeyRepository.findByCompanyNewestFirst(companyId);

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      lastUsedAt: key.lastUsedAt,
      active: key.active,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  async revokeKey(companyId: number, keyId: number): Promise<{ revoked: boolean }> {
    const apiKey = await this.apiKeyRepository.findByIdAndCompany(keyId, companyId);

    if (apiKey === null) {
      return { revoked: false };
    }

    apiKey.active = false;
    await this.apiKeyRepository.save(apiKey);

    return { revoked: true };
  }
}
