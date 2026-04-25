import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
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
import { IsNull, LessThan, Repository } from "typeorm";
import { User } from "../user/entities/user.entity";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyConfig } from "./passkey.config";

export interface PasskeyAuthenticationResult {
  user: User;
  passkey: Passkey;
}

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);

  constructor(
    @InjectRepository(Passkey) private readonly passkeyRepo: Repository<Passkey>,
    @InjectRepository(PasskeyChallenge)
    private readonly challengeRepo: Repository<PasskeyChallenge>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly config: PasskeyConfig,
  ) {}

  async registrationOptions(userId: number): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const existing = await this.passkeyRepo.find({ where: { userId } });

    const options = await generateRegistrationOptions({
      rpName: this.config.rpName(),
      rpID: this.config.rpId(),
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
  ): Promise<Passkey> {
    const challenge = await this.consumeChallenge(userId, "registration");

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.config.origins(),
      expectedRPID: this.config.rpId(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException("Passkey registration could not be verified");
    }

    const info = verification.registrationInfo;
    const credential = info.credential;

    const passkey = this.passkeyRepo.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: String(credential.counter ?? 0),
      transports: credential.transports ? [...credential.transports] : [],
      deviceName: deviceName?.trim() || null,
      backupEligible: info.credentialBackedUp,
      backupState: info.credentialBackedUp,
    });

    return this.passkeyRepo.save(passkey);
  }

  async authenticationOptions(
    email: string | undefined,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const user = email ? await this.userRepo.findOne({ where: { email } }) : null;

    const allowCredentials = user
      ? (await this.passkeyRepo.find({ where: { userId: user.id } })).map((passkey) => ({
          id: passkey.credentialId,
          transports: this.normaliseTransports(passkey.transports),
        }))
      : [];

    const options = await generateAuthenticationOptions({
      rpID: this.config.rpId(),
      userVerification: "preferred",
      allowCredentials,
    });

    await this.storeChallenge(user?.id ?? null, options.challenge, "authentication");

    return options;
  }

  async verifyAuthentication(
    response: AuthenticationResponseJSON,
  ): Promise<PasskeyAuthenticationResult> {
    const passkey = await this.passkeyRepo.findOne({
      where: { credentialId: response.id },
    });

    if (!passkey) {
      throw new UnauthorizedException("Unknown credential");
    }

    const challenge = await this.consumeChallenge(passkey.userId, "authentication");

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.config.origins(),
      expectedRPID: this.config.rpId(),
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
      throw new UnauthorizedException("Authenticator counter regression detected");
    }

    passkey.counter = String(newCounter);
    passkey.lastUsedAt = new Date();
    passkey.backupState = info.credentialBackedUp;
    await this.passkeyRepo.save(passkey);

    const user = await this.userRepo.findOne({
      where: { id: passkey.userId },
      relations: ["roles"],
    });

    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }

    return { user, passkey };
  }

  async listForUser(userId: number): Promise<Passkey[]> {
    return this.passkeyRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async rename(userId: number, passkeyId: number, deviceName: string): Promise<Passkey> {
    const passkey = await this.passkeyRepo.findOne({
      where: { id: passkeyId, userId },
    });

    if (!passkey) {
      throw new NotFoundException("Passkey not found");
    }

    passkey.deviceName = deviceName.trim() || null;
    return this.passkeyRepo.save(passkey);
  }

  async revoke(userId: number, passkeyId: number): Promise<void> {
    const passkey = await this.passkeyRepo.findOne({
      where: { id: passkeyId, userId },
    });

    if (!passkey) {
      throw new NotFoundException("Passkey not found");
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const remaining = await this.passkeyRepo.count({ where: { userId } });
    const hasPassword = !!user?.passwordHash;

    if (remaining <= 1 && !hasPassword) {
      throw new BadRequestException(
        "Cannot remove the last passkey when no password is set — set a password first",
      );
    }

    await this.passkeyRepo.delete({ id: passkeyId, userId });
  }

  async purgeExpiredChallenges(): Promise<number> {
    const result = await this.challengeRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  private async storeChallenge(
    userId: number | null,
    challenge: string,
    type: "registration" | "authentication",
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.challengeTtlSeconds() * 1000);
    await this.challengeRepo.save(
      this.challengeRepo.create({ userId, challenge, type, expiresAt }),
    );
  }

  private async consumeChallenge(
    userId: number | null,
    type: "registration" | "authentication",
  ): Promise<string> {
    const where = userId !== null ? { userId, type } : { userId: IsNull(), type };
    const challenge = await this.challengeRepo.findOne({
      where,
      order: { createdAt: "DESC" },
    });

    if (!challenge) {
      throw new UnauthorizedException("No active challenge — restart the flow");
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.challengeRepo.delete({ id: challenge.id });
      throw new UnauthorizedException("Challenge expired");
    }

    await this.challengeRepo.delete({ id: challenge.id });
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
