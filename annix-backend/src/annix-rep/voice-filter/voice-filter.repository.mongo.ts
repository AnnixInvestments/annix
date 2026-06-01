import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { VoiceProfile } from "./voice-filter.entity";
import { VoiceProfileRepository } from "./voice-filter.repository";

@Injectable()
export class MongoVoiceProfileRepository
  extends MongoCrudRepository<VoiceProfile>
  implements VoiceProfileRepository
{
  constructor(@InjectModel("VoiceProfile") model: Model<VoiceProfile>) {
    super(model);
  }

  async findByUserId(userId: number): Promise<VoiceProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }
}
