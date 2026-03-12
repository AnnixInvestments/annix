import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO, now, nowISO } from "../lib/datetime";
import { ComplySaApiKey } from "./entities/api-key.entity";

@Injectable()
export class ComplySaApiKeysService {
  constructor(
    @InjectRepository(ComplySaApiKey)
    private readonly apiKeyRepository: Repository<ComplySaApiKey>,
  ) {}

  async generateKey(companyId: number, name: string): Promise<{ key: string; id: number }> {
    const plainKey = `ac_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(plainKey).digest("hex");

    const apiKey = this.apiKeyRepository.create({
      companyId,
      keyHash,
      name,
      active: true,
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    return { key: plainKey, id: saved.id };
  }

  async validateKey(plainKey: string): Promise<{ companyId: number } | null> {
    const keyHash = createHash("sha256").update(plainKey).digest("hex");

    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash, active: true },
    });

    if (apiKey === null) {
      return null;
    }

    if (apiKey.expiresAt !== null && fromISO(apiKey.expiresAt) < now()) {
      return null;
    }

    apiKey.lastUsedAt = nowISO();
    await this.apiKeyRepository.save(apiKey);

    return { companyId: apiKey.companyId };
  }

  async listKeys(companyId: number): Promise<
    Array<{
      id: number;
      name: string;
      lastUsedAt: string | null;
      active: boolean;
      expiresAt: string | null;
      createdAt: Date;
    }>
  > {
    const keys = await this.apiKeyRepository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });

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
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, companyId },
    });

    if (apiKey === null) {
      return { revoked: false };
    }

    apiKey.active = false;
    await this.apiKeyRepository.save(apiKey);

    return { revoked: true };
  }
}
