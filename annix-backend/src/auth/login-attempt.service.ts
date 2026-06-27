import { createHash } from "node:crypto";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection, mongo } from "mongoose";
import { now } from "../lib/datetime";

interface LoginAttemptDoc {
  _id: string;
  count: number;
  lockedUntil?: Date;
  expiresAt: Date;
}

const COLLECTION = "auth_login_attempts";
const LOCKOUT_THRESHOLD = 5;
const MAX_LOCK_SECONDS = 15 * 60;
const BASE_LOCK_SECONDS = 30;
const MAX_BACKOFF_EXPONENT = 20;
const ATTEMPT_TTL_HOURS = 24;

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async assertNotLocked(email: string, ip: string): Promise<void> {
    const attempts = this.attempts();
    if (attempts == null) {
      return;
    }
    try {
      const doc = await attempts.findOne({ _id: this.key(email, ip) });
      if (doc?.lockedUntil != null && doc.lockedUntil.getTime() > now().toMillis()) {
        throw new UnauthorizedException("Too many failed attempts. Please wait and try again.");
      }
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Login lockout read failed open (allowing attempt): ${this.message(error)}`);
    }
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    const attempts = this.attempts();
    if (attempts == null) {
      return;
    }
    try {
      const id = this.key(email, ip);
      const doc = await attempts.findOneAndUpdate(
        { _id: id },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: now().plus({ hours: ATTEMPT_TTL_HOURS }).toJSDate() },
        },
        { upsert: true, returnDocument: "after", projection: { count: 1 } },
      );
      const count = doc?.count ?? 1;
      if (count >= LOCKOUT_THRESHOLD) {
        await attempts.updateOne({ _id: id }, { $set: { lockedUntil: this.lockUntil(count) } });
      }
    } catch (error: unknown) {
      this.logger.warn(`Login lockout write failed open: ${this.message(error)}`);
    }
  }

  async recordSuccess(email: string, ip: string): Promise<void> {
    const attempts = this.attempts();
    if (attempts == null) {
      return;
    }
    try {
      await attempts.deleteOne({ _id: this.key(email, ip) });
    } catch (error: unknown) {
      this.logger.warn(`Login lockout reset failed open: ${this.message(error)}`);
    }
  }

  private lockUntil(count: number): Date {
    const exponent = Math.min(count - LOCKOUT_THRESHOLD, MAX_BACKOFF_EXPONENT);
    const seconds = Math.min(MAX_LOCK_SECONDS, BASE_LOCK_SECONDS * 2 ** exponent);
    return now().plus({ seconds }).toJSDate();
  }

  private key(email: string, ip: string): string {
    return createHash("sha256").update(`${email.trim().toLowerCase()}|${ip}`).digest("hex");
  }

  private attempts(): mongo.Collection<LoginAttemptDoc> | null {
    const db = this.connection.db;
    return db == null ? null : db.collection<LoginAttemptDoc>(COLLECTION);
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
