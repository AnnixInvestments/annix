import type {
  ExternalCandidate,
  SourcingPlan,
  SupplierDraftBucket,
  UnmatchedItem,
} from "./sourcing-matcher";
import type { CanonicalCategory } from "./supplier-category.crosswalk";

export interface StoredSourcingBucket extends SupplierDraftBucket {
  bucketRef: string;
  draftBody: string | null;
  publishedBoqId?: number | null;
  publishState?: "published";
}

export interface StoredSourcingPlan {
  autoBuckets: StoredSourcingBucket[];
  manualCandidates: ExternalCandidate[];
  unmatchedItems: UnmatchedItem[];
  categoriesWithoutSupplier: CanonicalCategory[];
  generatedAt: string;
}

export function sourcingBucketRef(supplierProfileId: number, category: string): string {
  return `${supplierProfileId}::${category}`;
}

export function toStoredPlan(plan: SourcingPlan, generatedAt: string): StoredSourcingPlan {
  return {
    autoBuckets: plan.autoBuckets.map((bucket) => ({
      ...bucket,
      bucketRef: sourcingBucketRef(bucket.supplierProfileId, bucket.category),
      draftBody: null,
    })),
    manualCandidates: plan.manualCandidates,
    unmatchedItems: plan.unmatchedItems,
    categoriesWithoutSupplier: plan.categoriesWithoutSupplier,
    generatedAt,
  };
}
