import { Injectable, Logger } from "@nestjs/common";
import { now } from "../lib/datetime";
import { AppRepository, AppRoleRepository, UserAppAccessRepository } from "./rbac.repository";
import { RbacAccessDetailsCache } from "./rbac-access-details-cache";
import { RbacCacheEpochService } from "./rbac-cache-epoch.service";

/**
 * Low-dependency RBAC grant primitive for issue #311 step 4.1.
 *
 * Depends ONLY on the three RBAC repositories (App, AppRole,
 * UserAppAccess) — deliberately NOT on RbacService, which pulls in
 * AdminModule/UserSyncModule and would create import cycles when a
 * per-portal auth module wants to anchor a freshly-registered user.
 *
 * The single grant primitive (`ensureAppAccess`) is idempotent and
 * never throws into the caller: a registration flow must not fail
 * just because the RBAC catalogue isn't seeded for an app yet. The
 * grant it writes is INERT today — no guard consults UserAppAccess
 * for the straggler portals (Annix Pulse, Teacher Assistant) until
 * step 4.3 wires the unified guard, which is gated behind a staging
 * privilege-matrix before any production flag flip.
 */
@Injectable()
export class RbacBridgeService {
  private readonly logger = new Logger(RbacBridgeService.name);

  constructor(
    private readonly appRepo: AppRepository,
    private readonly roleRepo: AppRoleRepository,
    private readonly accessRepo: UserAppAccessRepository,
    private readonly accessDetailsCache: RbacAccessDetailsCache,
    private readonly cacheEpoch: RbacCacheEpochService,
  ) {}

  async ensureAppAccess(userId: number, appCode: string, roleCode: string): Promise<void> {
    try {
      const app = await this.appRepo.findByCode(appCode);
      if (!app) {
        this.logger.warn(`ensureAppAccess: app '${appCode}' not found — skipping anchor`);
        return;
      }

      const existing = await this.accessRepo.findOneByUserAndApp(userId, app.id);
      if (existing) {
        return;
      }

      const role = await this.roleRepo.findByAppIdAndCode(app.id, roleCode);
      await this.accessRepo.create({
        userId,
        appId: app.id,
        roleId: role?.id ?? null,
        useCustomPermissions: false,
        grantedById: null,
        expiresAt: null,
        grantedAt: now().toJSDate(),
      });
      this.accessDetailsCache.invalidate(userId, appCode);
      this.cacheEpoch.bump();
      this.logger.log(`Anchored user ${userId} to app '${appCode}' (role '${roleCode}')`);
    } catch (error) {
      this.logger.warn(
        `ensureAppAccess(${userId}, '${appCode}') failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
