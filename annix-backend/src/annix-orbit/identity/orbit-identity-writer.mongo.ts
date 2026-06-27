import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { FEATURE_FLAGS } from "../../feature-flags/feature-flags.constants";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import { now } from "../../lib/datetime";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import type { User } from "../../user/entities/user.entity";
import type { OrbitIdentity } from "./entities/orbit-identity.entity";
import {
  type OrbitIdentityProfileChanges,
  type OrbitIdentityWriteOp,
  OrbitIdentityWriter,
} from "./orbit-identity-writer";
import type { OrbitModule } from "./orbit-module";
import { IdentityRegistryRepository } from "./repositories/identity-registry.repository";
import { OrbitCompanyIdentityRepository } from "./repositories/orbit-company-identity.repository";
import type { OrbitIdentityRepository } from "./repositories/orbit-identity.repository";
import { OrbitRecruiterIdentityRepository } from "./repositories/orbit-recruiter-identity.repository";
import { OrbitSeekerIdentityRepository } from "./repositories/orbit-seeker-identity.repository";
import { OrbitStudentIdentityRepository } from "./repositories/orbit-student-identity.repository";

const RECONCILE_QUEUE_COLLECTION = "orbit_identity_reconcile_queue";
const REGISTRY_APP = "orbit";

type IdentityPatch = Partial<OrbitIdentity> & { id: number };

function emailLowerOf(email: string | null | undefined): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

@Injectable()
export class MongoOrbitIdentityWriter extends OrbitIdentityWriter {
  private readonly logger = new Logger(MongoOrbitIdentityWriter.name);
  private readonly repoByModule: Record<OrbitModule, OrbitIdentityRepository<OrbitIdentity>>;

  constructor(
    companyRepo: OrbitCompanyIdentityRepository,
    seekerRepo: OrbitSeekerIdentityRepository,
    recruiterRepo: OrbitRecruiterIdentityRepository,
    studentRepo: OrbitStudentIdentityRepository,
    private readonly registry: IdentityRegistryRepository,
    private readonly flags: FeatureFlagsService,
    @InjectConnection(ORBIT_CONNECTION) private readonly orbitConnection: Connection,
  ) {
    super();
    this.repoByModule = {
      company: companyRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
      seeker: seekerRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
      recruiter: recruiterRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
      student: studentRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
    };
  }

  private enabled(): Promise<boolean> {
    return this.flags.isEnabled(FEATURE_FLAGS.ORBIT_IDENTITY_DUAL_WRITE);
  }

  private repoFor(module: OrbitModule): OrbitIdentityRepository<OrbitIdentity> {
    return this.repoByModule[module];
  }

  private saveIdentity(module: OrbitModule, patch: IdentityPatch): Promise<OrbitIdentity> {
    // MongoCrudRepository.save upserts by `_id` and $sets only the provided
    // fields — partial-safe and idempotent (identity `_id` == user `_id`).
    return this.repoFor(module).save(patch as unknown as OrbitIdentity);
  }

  private identityFromUser(module: OrbitModule, user: User): IdentityPatch {
    return {
      id: user.id,
      email: user.email,
      emailLower: emailLowerOf(user.email),
      passwordHash: user.passwordHash ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      emailVerified: user.emailVerified,
      emailVerificationToken: user.emailVerificationToken ?? null,
      emailVerificationExpires: user.emailVerificationExpires ?? null,
      resetPasswordToken: user.resetPasswordToken ?? null,
      resetPasswordExpires: user.resetPasswordExpires ?? null,
      oauthProvider: user.oauthProvider ?? null,
      oauthId: user.oauthId ?? null,
      module,
      status: user.status,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
    };
  }

  private async mirror(
    op: OrbitIdentityWriteOp,
    userId: number,
    module: OrbitModule,
    work: () => Promise<void>,
  ): Promise<void> {
    try {
      await work();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Orbit identity mirror failed op=${op} userId=${userId} module=${module}: ${reason}`,
      );
      await this.enqueueReconcile(op, userId, module, reason);
    }
  }

  private async enqueueReconcile(
    op: OrbitIdentityWriteOp,
    userId: number,
    module: OrbitModule,
    reason: string,
  ): Promise<void> {
    try {
      const db = this.orbitConnection.db;
      if (!db) {
        this.logger.error(`Reconcile enqueue skipped (no db) op=${op} userId=${userId}`);
        return;
      }
      await db.collection(RECONCILE_QUEUE_COLLECTION).insertOne({
        userId,
        module,
        op,
        reason,
        status: "pending",
        enqueuedAt: now().toJSDate(),
      });
    } catch (enqueueError) {
      const reason2 = enqueueError instanceof Error ? enqueueError.message : String(enqueueError);
      this.logger.error(
        `Failed to enqueue Orbit identity reconcile op=${op} userId=${userId}: ${reason2}`,
      );
    }
  }

  async createIdentity(module: OrbitModule, user: User): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("createIdentity", user.id, module, async () => {
      await this.saveIdentity(module, this.identityFromUser(module, user));
      await this.registry.upsert(user.id, REGISTRY_APP, module, emailLowerOf(user.email));
    });
  }

  async applyVerification(userId: number, module: OrbitModule): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("applyVerification", userId, module, () =>
      this.saveIdentity(module, {
        id: userId,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: "active",
      }).then(() => undefined),
    );
  }

  async setVerificationToken(
    userId: number,
    module: OrbitModule,
    token: string | null,
    expires: Date | null,
  ): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("setVerificationToken", userId, module, () =>
      this.saveIdentity(module, {
        id: userId,
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      }).then(() => undefined),
    );
  }

  async setResetToken(
    userId: number,
    module: OrbitModule,
    token: string | null,
    expires: Date | null,
  ): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("setResetToken", userId, module, () =>
      this.saveIdentity(module, {
        id: userId,
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      }).then(() => undefined),
    );
  }

  async applyPasswordReset(
    userId: number,
    module: OrbitModule,
    passwordHash: string,
  ): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("applyPasswordReset", userId, module, () =>
      this.saveIdentity(module, {
        id: userId,
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }).then(() => undefined),
    );
  }

  async recordLogin(userId: number, module: OrbitModule, at: Date): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("recordLogin", userId, module, () =>
      this.saveIdentity(module, { id: userId, lastLoginAt: at }).then(() => undefined),
    );
  }

  async applyProfileChanges(
    userId: number,
    module: OrbitModule,
    changes: OrbitIdentityProfileChanges,
  ): Promise<void> {
    if (!(await this.enabled())) return;
    const patch: IdentityPatch = { id: userId };
    if (changes.firstName !== undefined) patch.firstName = changes.firstName;
    if (changes.lastName !== undefined) patch.lastName = changes.lastName;
    if (changes.status !== undefined && changes.status !== null) patch.status = changes.status;
    let newEmailLower: string | null = null;
    if (changes.email !== undefined && changes.email !== null) {
      patch.email = changes.email;
      newEmailLower = emailLowerOf(changes.email);
      patch.emailLower = newEmailLower;
    }
    await this.mirror("applyProfileChanges", userId, module, async () => {
      await this.saveIdentity(module, patch);
      if (newEmailLower) {
        await this.registry.upsert(userId, REGISTRY_APP, module, newEmailLower);
      }
    });
  }

  async setStatus(userId: number, module: OrbitModule, status: string): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("setStatus", userId, module, () =>
      this.saveIdentity(module, { id: userId, status }).then(() => undefined),
    );
  }

  async deleteIdentity(userId: number, module: OrbitModule): Promise<void> {
    if (!(await this.enabled())) return;
    await this.mirror("deleteIdentity", userId, module, async () => {
      await this.repoFor(module).remove({ id: userId } as unknown as OrbitIdentity);
      await this.registry.deleteByUserId(userId);
    });
  }
}
