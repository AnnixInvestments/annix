import type { mongo } from "mongoose";

type NumericDoc = { _id: number; [key: string]: unknown };

const COCS = "rubber_au_cocs";
const ITEMS = "rubber_au_coc_items";
const INDEX = "uniq_customer_deliverynoteref";
const SOURCE_INDEX = "idx_au_coc_source_delivery_note";

const STATUS_RANK: Record<string, number> = {
  SENT: 4,
  APPROVED: 3,
  GENERATED: 2,
  DRAFT: 1,
};

function rankOf(status: unknown): number {
  const key = typeof status === "string" ? status.toUpperCase() : "";
  return STATUS_RANK[key] ?? 0;
}

function hasIssuedEvidence(doc: NumericDoc): boolean {
  return doc.sentToEmail != null || doc.generatedPdfPath != null;
}

function sentAtMillis(doc: NumericDoc): number {
  const sentAt = doc.sentAt;
  if (sentAt instanceof Date) return sentAt.getTime();
  if (typeof sentAt === "string") {
    const parsed = Date.parse(sentAt);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  }
  return Number.POSITIVE_INFINITY;
}

// Pick which of two duplicate CoCs to KEEP. Prefer the strongest status; on a
// tie prefer the one with issued evidence (a generated PDF / a send), then the
// one delivered to the customer FIRST (earliest sentAt — that is the document
// they actually hold), then the earliest created (_id) for stability.
function keeperOf(best: NumericDoc, candidate: NumericDoc): NumericDoc {
  const byStatus = rankOf(candidate.status) - rankOf(best.status);
  if (byStatus !== 0) return byStatus > 0 ? candidate : best;
  const byEvidence = Number(hasIssuedEvidence(candidate)) - Number(hasIssuedEvidence(best));
  if (byEvidence !== 0) return byEvidence > 0 ? candidate : best;
  const bySentAt = sentAtMillis(candidate) - sentAtMillis(best);
  if (bySentAt !== 0) return bySentAt < 0 ? candidate : best;
  return Number(candidate._id) < Number(best._id) ? candidate : best;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const cocs = db.collection<NumericDoc>(COCS);

  // Normalise blank/whitespace-only delivery-note refs to "missing" so they fall
  // outside the partial unique index — an empty or "   " string would otherwise
  // collide across every ref-less CoC for the same customer and block index
  // creation.
  await cocs.updateMany(
    { $or: [{ deliveryNoteRef: null }, { deliveryNoteRef: { $regex: "^\\s*$" } }] },
    { $unset: { deliveryNoteRef: "" } },
  );

  // Collapse existing duplicate CoCs sharing a customer + delivery-note ref.
  // Keep the most advanced / actually-issued one and delete the rest plus their
  // line items, so each delivery shows a single certificate.
  const groups = await cocs
    .aggregate<{ ids: number[] }>([
      { $match: { deliveryNoteRef: { $type: "string" } } },
      {
        $group: {
          _id: { customerCompanyId: "$customerCompanyId", deliveryNoteRef: "$deliveryNoteRef" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  const idsToDelete = (
    await Promise.all(
      groups.map(async (group) => {
        const docs = await cocs.find({ _id: { $in: group.ids } }).toArray();
        const keeper = docs.reduce(keeperOf, docs[0]);
        return docs
          .filter((doc) => Number(doc._id) !== Number(keeper._id))
          .map((doc) => Number(doc._id));
      }),
    )
  ).flat();

  if (idsToDelete.length > 0) {
    console.log(
      `[dedupe-au-cocs] deleting ${idsToDelete.length} duplicate CoC(s): ${idsToDelete.join(", ")}`,
    );
    await db.collection<NumericDoc>(ITEMS).deleteMany({ auCocId: { $in: idsToDelete } });
    await cocs.deleteMany({ _id: { $in: idsToDelete } });
  }

  await cocs.createIndex(
    { customerCompanyId: 1, deliveryNoteRef: 1 },
    {
      name: INDEX,
      unique: true,
      partialFilterExpression: { deliveryNoteRef: { $type: "string" } },
    },
  );

  // The dedup guard also looks up by sourceDeliveryNoteId on every readiness
  // trigger and every create; index it (partial — most CoCs are ref-only and
  // have no source DN) so that lookup is a point read, not a collection scan.
  await cocs.createIndex(
    { sourceDeliveryNoteId: 1 },
    {
      name: SOURCE_INDEX,
      partialFilterExpression: { sourceDeliveryNoteId: { $type: "number" } },
    },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  const cocs = db.collection<NumericDoc>(COCS);
  await cocs.dropIndex(INDEX).catch(() => null);
  await cocs.dropIndex(SOURCE_INDEX).catch(() => null);
};
