import { Global, Module } from "@nestjs/common";
import { RbacAccessDetailsCache } from "./rbac-access-details-cache";
import { RbacCacheEpochService } from "./rbac-cache-epoch.service";

/**
 * Process-wide store for resolved RBAC access details (#403 performance-1).
 *
 * Lives in its own dependency-free {@link Global} module so both the full
 * RbacService (cache owner / reader) and the cycle-free RbacBridgeService
 * (a direct grant writer) can invalidate the same entries without either
 * module importing the other — keeping the bridge free of the AdminModule
 * import cycle it was extracted to avoid.
 *
 * RbacCacheEpochService (#405 devops-1) propagates invalidations across machines
 * so the cache stays correct at min_machines_running > 1.
 */
@Global()
@Module({
  providers: [RbacAccessDetailsCache, RbacCacheEpochService],
  exports: [RbacAccessDetailsCache, RbacCacheEpochService],
})
export class RbacAccessDetailsCacheModule {}
