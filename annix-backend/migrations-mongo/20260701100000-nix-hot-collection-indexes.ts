import type { mongo } from "mongoose";

// Indexes for the hot Nix collections. autoIndex is off in this app, so
// indexes must be built here rather than by Mongoose. Each spec below matches
// a real repository query (equality keys first, then the sort key) so the read
// is served by the index instead of a full collection scan on M0.
//
// - nix_chat_messages: findRecentForSession → find({ sessionId }).sort({ createdAt: -1 }).
//   This is the only genuinely unbounded Nix collection (one row per chat turn),
//   read on every chat load.
// - nix_extractions: findBySessionOrderedAsc / findLatestSameSessionDuplicate
//   (sessionId [+ documentName]), findRecentForUser (userId, createdAt desc),
//   findRevisionCandidates (documentNumber, isLatestRevision, status) — the last
//   is the cross-tenant revision scan.
// - nix_clarifications: findPendingForExtractionOrdered / countPendingForExtraction
//   → { extractionId, status } sorted by createdAt asc.
const INDEXES: { collection: string; keys: mongo.IndexSpecification; name: string }[] = [
  {
    collection: "nix_chat_messages",
    keys: { sessionId: 1, createdAt: -1 },
    name: "nix_chat_messages_session_recent",
  },
  {
    collection: "nix_extractions",
    keys: { sessionId: 1, documentName: 1 },
    name: "nix_extractions_session_document",
  },
  {
    collection: "nix_extractions",
    keys: { userId: 1, createdAt: -1 },
    name: "nix_extractions_user_recent",
  },
  {
    collection: "nix_extractions",
    keys: { documentNumber: 1, isLatestRevision: 1, status: 1 },
    name: "nix_extractions_revision_candidates",
  },
  {
    collection: "nix_clarifications",
    keys: { extractionId: 1, status: 1, createdAt: 1 },
    name: "nix_clarifications_extraction_pending",
  },
];

export const up = async (db: mongo.Db): Promise<void> => {
  await Promise.all(
    INDEXES.map((index) =>
      db.collection(index.collection).createIndex(index.keys, { name: index.name }),
    ),
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await Promise.all(
    INDEXES.map((index) =>
      db
        .collection(index.collection)
        .dropIndex(index.name)
        .catch(() => undefined),
    ),
  );
};
