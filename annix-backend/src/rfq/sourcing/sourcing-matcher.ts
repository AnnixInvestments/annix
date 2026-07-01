import {
  evaluateSizePressureMaterial,
  type ItemSizePressureMaterial,
  type SupplierCapabilitySignals,
} from "./capability-matching";
import {
  type CanonicalCategory,
  canonicalForBundleKey,
  canonicalForItem,
  type ItemLikeForCategory,
} from "./supplier-category.crosswalk";

export interface RegisteredCandidateCapability extends SupplierCapabilitySignals {
  category: CanonicalCategory;
}

export interface RegisteredCandidate {
  supplierProfileId: number;
  name: string;
  email: string | null;
  priority: number;
  capabilities: RegisteredCandidateCapability[];
}

export interface ExternalCandidate {
  preferredSupplierId: number;
  name: string;
  email: string | null;
  priority: number;
}

export interface SourcingItemInput extends ItemSizePressureMaterial, ItemLikeForCategory {
  rowNumber: number;
  description: string;
  quantity: number;
  unit: string;
  bundleKey?: string | null;
}

export interface DraftLineItem {
  rowNumber: number;
  description: string;
  quantity: number;
  unit: string;
  category: CanonicalCategory;
  score: number;
  warnings: string[];
  reasons: string[];
  dualRoute: boolean;
}

export interface SupplierDraftBucket {
  supplierProfileId: number;
  name: string;
  email: string | null;
  category: CanonicalCategory;
  items: DraftLineItem[];
}

export interface UnmatchedItem {
  rowNumber: number;
  description: string;
  reason: string;
}

export interface SourcingPlan {
  autoBuckets: SupplierDraftBucket[];
  manualCandidates: ExternalCandidate[];
  unmatchedItems: UnmatchedItem[];
  categoriesWithoutSupplier: CanonicalCategory[];
}

export function resolveItemCategories(item: SourcingItemInput): {
  categories: CanonicalCategory[];
  unmatched: boolean;
} {
  if (item.bundleKey) {
    const byBundle = canonicalForBundleKey(item.bundleKey);
    if (byBundle.source === "bundle") {
      return { categories: byBundle.categories, unmatched: byBundle.unmatched };
    }
  }
  const byItem = canonicalForItem(item);
  return { categories: byItem.categories, unmatched: byItem.unmatched };
}

function bucketKey(supplierProfileId: number, category: CanonicalCategory): string {
  return `${supplierProfileId}::${category}`;
}

function candidatesByCategory(
  candidates: RegisteredCandidate[],
): Map<CanonicalCategory, RegisteredCandidate[]> {
  return candidates.reduce((byCategory, candidate) => {
    const categories = [...new Set(candidate.capabilities.map((cap) => cap.category))];
    categories.forEach((category) => {
      const existing = byCategory.get(category) ?? [];
      byCategory.set(category, [...existing, candidate]);
    });
    return byCategory;
  }, new Map<CanonicalCategory, RegisteredCandidate[]>());
}

function capabilityFor(
  candidate: RegisteredCandidate,
  category: CanonicalCategory,
): SupplierCapabilitySignals {
  return candidate.capabilities.find((cap) => cap.category === category) ?? {};
}

export function buildSourcingPlan(
  items: SourcingItemInput[],
  registered: RegisteredCandidate[],
  external: ExternalCandidate[],
): SourcingPlan {
  const categoryIndex = candidatesByCategory(registered);

  const seed = {
    buckets: new Map<string, SupplierDraftBucket>(),
    unmatchedItems: [] as UnmatchedItem[],
    categoriesWithoutSupplier: new Set<CanonicalCategory>(),
  };

  const outcome = items.reduce((acc, item) => {
    const { categories, unmatched } = resolveItemCategories(item);

    if (unmatched || categories.length === 0) {
      return {
        ...acc,
        unmatchedItems: [
          ...acc.unmatchedItems,
          {
            rowNumber: item.rowNumber,
            description: item.description,
            reason: "could not classify item into a supplier category",
          },
        ],
      };
    }

    const dualRoute = categories.length > 1;

    return categories.reduce((catAcc, category) => {
      const candidates = categoryIndex.get(category) ?? [];

      if (candidates.length === 0) {
        catAcc.categoriesWithoutSupplier.add(category);
        return {
          ...catAcc,
          unmatchedItems: [
            ...catAcc.unmatchedItems,
            {
              rowNumber: item.rowNumber,
              description: item.description,
              reason: `no registered supplier for category ${category} — assign manually`,
            },
          ],
        };
      }

      const nextBuckets = candidates.reduce((buckets, candidate) => {
        const evaluation = evaluateSizePressureMaterial(item, capabilityFor(candidate, category));
        const key = bucketKey(candidate.supplierProfileId, category);
        const existing = buckets.get(key) ?? {
          supplierProfileId: candidate.supplierProfileId,
          name: candidate.name,
          email: candidate.email,
          category,
          items: [] as DraftLineItem[],
        };
        existing.items.push({
          rowNumber: item.rowNumber,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          category,
          score: evaluation.score,
          warnings: evaluation.warnings,
          reasons: evaluation.reasons,
          dualRoute,
        });
        return new Map(buckets).set(key, existing);
      }, catAcc.buckets);

      return { ...catAcc, buckets: nextBuckets };
    }, acc);
  }, seed);

  return {
    autoBuckets: [...outcome.buckets.values()].sort(
      (a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name),
    ),
    manualCandidates: [...external].sort((a, b) => a.priority - b.priority),
    unmatchedItems: outcome.unmatchedItems,
    categoriesWithoutSupplier: [...outcome.categoriesWithoutSupplier],
  };
}
