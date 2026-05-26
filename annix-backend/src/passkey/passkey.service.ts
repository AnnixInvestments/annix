import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { AuditService } from "../audit/audit.service";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { Passkey } from "./entities/passkey.entity";
import type { PasskeyChallengeType } from "./entities/passkey-challenge.entity";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyRepository } from "./passkey.repository";
import { PasskeyChallengeRepository } from "./passkey-challenge.repository";

export interface PasskeyAuthenticationResult {
  user: User;
  passkey: Passkey;
}

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);

  constructor(
    private readonly passkeyRepo: PasskeyRepository,
    private readonly challengeRepo: PasskeyChallengeRepository,
    private readonly userRepo: UserRepository,
    private readonly config: PasskeyConfig,
    private readonly auditService: AuditService,
  ) {}

  private async audit(
    userId: number,
    subAction: "passkey-registered" | "passkey-revoked" | "passkey-login" | "passkey-login-failed",
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService.logApp({
        appName: "auth",
        subAction,
        userId,
        details,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to audit ${subAction} for user ${userId}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  async registrationOptions(
    userId: number,
    requestHost?: string | null,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const existing = await this.passkeyRepo.findByUserId(userId);

    const options = await generateRegistrationOptions({
      rpName: this.config.rpName(),
      rpID: this.config.rpId(requestHost),
      userID: this.userIdBytes(userId),
      userName: user.email || user.username || `user-${userId}`,
      userDisplayName: this.displayName(user),
      attestationType: "none",
      excludeCredentials: existing.map((passkey) => ({
        id: passkey.credentialId,
        transports: this.normaliseTransports(passkey.transports),
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await this.storeChallenge(userId, options.challenge, "registration");

    return options;
  }

  async verifyRegistration(
    userId: number,
    response: RegistrationResponseJSON,
    deviceName: string | null,
    requestHost?: string | null,
  ): Promise<Passkey> {
    const challenge = await this.consumeChallenge(userId, "registration");

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.config.origins(requestHost),
      expectedRPID: this.config.rpId(requestHost),
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException("Passkey registration could not be verified");
    }

    const info = verification.registrationInfo;
    const credential = info.credential;

    const saved = await this.passkeyRepo.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: String(credential.counter ?? 0),
      transports: credential.transports ? [...credential.transports] : [],
      deviceName: deviceName?.trim() || null,
      backupEligible: info.credentialBackedUp,
      backupState: info.credentialBackedUp,
    });

    await this.audit(userId, "passkey-registered", {
      passkeyId: saved.id,
      deviceName: saved.deviceName,
      backupEligible: saved.backupEligible,
    });
    return saved;
  }

  async authenticationOptions(
    email: string | undefined,
    requestHost?: string | null,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const user = email ? await this.userRepo.findOneByEmail(email) : null;

    const allowCredentials = user
      ? (await this.passkeyRepo.findByUserId(user.id)).map((passkey) => ({
          id: passkey.credentialId,
          transports: this.normaliseTransports(passkey.transports),
        }))
      : [];

    const options = await generateAuthenticationOptions({
      rpID: this.config.rpId(requestHost),
      userVerification: "preferred",
      allowCredentials,
    });

    await this.storeChallenge(user?.id ?? null, options.challenge, "authentication");

    return options;
  }

  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    requestHost?: string | null,
  ): Promise<PasskeyAuthenticationResult> {
    const passkey = await this.passkeyRepo.findByCredentialId(response.id);

    if (!passkey) {
      throw new UnauthorizedException("Unknown credential");
    }

    const challenge = await this.consumeAuthenticationChallenge(passkey.userId);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.config.origins(requestHost),
      expectedRPID: this.config.rpId(requestHost),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: Number(passkey.counter),
        transports: this.normaliseTransports(passkey.transports),
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      throw new UnauthorizedException("Passkey assertion failed");
    }

    const info = verification.authenticationInfo;
    const newCounter = info.newCounter;
    const previousCounter = Number(passkey.counter);

    if (newCounter !== 0 && newCounter <= previousCounter) {
      this.logger.warn(
        `Counter regression on passkey ${passkey.id} for user ${passkey.userId} — possible cloned authenticator`,
      );
      await this.audit(passkey.userId, "passkey-login-failed", {
        passkeyId: passkey.id,
        reason: "counter-regression",
      });
      throw new UnauthorizedException("Authenticator counter regression detected");
    }

    passkey.counter = String(newCounter);
    passkey.lastUsedAt = new Date();
    passkey.backupState = info.credentialBackedUp;
    await this.passkeyRepo.save(passkey);

    const user = await this.userRepo.findByIdWithRoles(passkey.userId);

    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }

    await this.audit(user.id, "passkey-login", {
      passkeyId: passkey.id,
      deviceName: passkey.deviceName,
    });

    return { user, passkey };
  }

  async listForUser(userId: number): Promise<Passkey[]> {
    return this.passkeyRepo.findByUserId(userId);
  }

  async rename(userId: number, passkeyId: number, deviceName: string): Promise<Passkey> {
    const passkey = await this.passkeyRepo.findOneWhere({ id: passkeyId, userId });

    if (!passkey) {
      throw new NotFoundException("Passkey not found");
    }

    passkey.deviceName = deviceName.trim() || null;
    return this.passkeyRepo.save(passkey);
  }

  async revoke(userId: number, passkeyId: number): Promise<void> {
    const passkey = await this.passkeyRepo.findOneWhere({ id: passkeyId, userId });

    if (!passkey) {
      throw new NotFoundException("Passkey not found");
    }

    const user = await this.userRepo.findById(userId);
    const remaining = await this.passkeyRepo.countByUserId(userId);
    const hasPassword = !!user?.passwordHash;

    if (remaining <= 1 && !hasPassword) {
      throw new BadRequestException(
        "Cannot remove the last passkey when no password is set — set a password first",
      );
    }

    await this.passkeyRepo.deleteByIdAndUserId(passkeyId, userId);
    await this.audit(userId, "passkey-revoked", {
      passkeyId,
      deviceName: passkey.deviceName,
    });
  }

  async purgeExpiredChallenges(): Promise<number> {
    return this.challengeRepo.deleteExpiredBefore(new Date());
  }

  private async storeChallenge(
    userId: number | null,
    challenge: string,
    type: PasskeyChallengeType,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.challengeTtlSeconds() * 1000);
    await this.challengeRepo.create({ userId, challenge, type, expiresAt });
  }

  private async consumeChallenge(
    userId: number | null,
    type: PasskeyChallengeType,
  ): Promise<string> {
    const challenge = await this.challengeRepo.findLatestForUserAndType(userId, type);

    if (!challenge) {
      throw new UnauthorizedException("No active challenge — restart the flow");
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.challengeRepo.deleteById(challenge.id);
      throw new UnauthorizedException("Challenge expired");
    }

    await this.challengeRepo.deleteById(challenge.id);
    return challenge.challenge;
  }

  private async consumeAuthenticationChallenge(userId: number): Promise<string> {
    const challenge = await this.challengeRepo.findLatestForAuthenticationByUserId(userId);

    if (!challenge) {
      throw new UnauthorizedException("No active challenge — restart the flow");
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.challengeRepo.deleteById(challenge.id);
      throw new UnauthorizedException("Challenge expired");
    }

    await this.challengeRepo.deleteById(challenge.id);
    return challenge.challenge;
  }

  private userIdBytes(userId: number): Uint8Array {
    return new TextEncoder().encode(String(userId));
  }

  private displayName(user: User): string {
    const first = user.firstName?.trim() || "";
    const last = user.lastName?.trim() || "";
    const full = `${first} ${last}`.trim();
    return full || user.email || user.username || `User ${user.id}`;
  }

  private normaliseTransports(
    transports: string[] | null | undefined,
  ): ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[] {
    if (!transports) return [];
    const valid = new Set(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"]);
    return transports.filter(
      (t): t is "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb" =>
        valid.has(t),
    );
  }
}
