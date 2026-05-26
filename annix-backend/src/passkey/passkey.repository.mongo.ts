import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyRepository } from "./passkey.repository";

@Injectable()
export class MongoPasskeyRepository
  extends MongoCrudRepository<Passkey>
  implements PasskeyRepository
{
  constructor(@InjectModel("Passkey") model: Model<Passkey>) {
    super(model);
  }

  async findByCredentialId(credentialId: string): Promise<Passkey | null> {
    const document = await this.documents.findOne({ credentialId }).lean().exec();
    return this.toDomain(document);
  }

  async findByUserId(userId: number): Promise<Passkey[]> {
    const documents = await this.documents.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(documents);
  }

  countByUserId(userId: number): Promise<number> {
    return this.documents.countDocuments({ userId }).exec();
  }

  async deleteByIdAndUserId(id: number, userId: number): Promise<void> {
    await this.documents.findOneAndDelete({ _id: id, userId }).exec();
  }
}
