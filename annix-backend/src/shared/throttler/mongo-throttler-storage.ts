import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { Model } from "mongoose";
import { fromJSDate, now, nowMillis } from "../../lib/datetime";
import type { ThrottlerHit } from "./throttler-hit.schema";

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

// Cross-instance throttler store: the in-memory default makes the effective
// limit `limit × Fly machine count` once the app auto-starts a second machine.
// Backing it with one shared Mongo collection keeps a single counter per key.
// Only throttled endpoints (auth, AI, messages) write here — not every request.
@Injectable()
export class MongoThrottlerStorage implements ThrottlerStorage {
  constructor(@InjectModel("ThrottlerHit") private readonly model: Model<ThrottlerHit>) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlExpiry = now().plus({ milliseconds: ttl }).toJSDate();
    const doc = await this.model
      .findOneAndUpdate(
        { key },
        [
          {
            $set: {
              totalHits: {
                $cond: [
                  { $gt: ["$expiresAt", "$$NOW"] },
                  { $add: [{ $ifNull: ["$totalHits", 0] }, 1] },
                  1,
                ],
              },
              expiresAt: {
                $cond: [{ $gt: ["$expiresAt", "$$NOW"] }, "$expiresAt", ttlExpiry],
              },
            },
          },
        ],
        { upsert: true, new: true, lean: true, updatePipeline: true },
      )
      .exec();

    const totalHits = doc?.totalHits ?? 1;
    const expiresAtMs = doc?.expiresAt ? fromJSDate(doc.expiresAt).toMillis() : nowMillis() + ttl;
    const timeToExpire = Math.max(0, Math.ceil((expiresAtMs - nowMillis()) / 1000));
    const isBlocked = totalHits > limit;
    return { totalHits, timeToExpire, isBlocked, timeToBlockExpire: isBlocked ? timeToExpire : 0 };
  }
}
