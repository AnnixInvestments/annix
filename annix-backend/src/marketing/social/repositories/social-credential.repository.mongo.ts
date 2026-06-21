import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { SocialCredential } from "../entities/social-credential.entity";
import { SocialCredentialRepository } from "./social-credential.repository";

@Injectable()
export class MongoSocialCredentialRepository
  extends MongoCrudRepository<SocialCredential>
  implements SocialCredentialRepository
{
  constructor(@InjectModel("SocialCredential") model: Model<SocialCredential>) {
    super(model);
  }

  build(data: Partial<SocialCredential>): SocialCredential {
    return data as SocialCredential;
  }
}
