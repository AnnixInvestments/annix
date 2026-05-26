import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  AnnixOrbitIndividualDocument,
  IndividualDocumentKind,
} from "../entities/annix-orbit-individual-document.entity";
import { AnnixOrbitIndividualDocumentRepository } from "./annix-orbit-individual-document.repository";

@Injectable()
export class PostgresAnnixOrbitIndividualDocumentRepository
  extends TypeOrmCrudRepository<AnnixOrbitIndividualDocument>
  implements AnnixOrbitIndividualDocumentRepository
{
  constructor(
    @InjectRepository(AnnixOrbitIndividualDocument)
    repository: Repository<AnnixOrbitIndividualDocument>,
  ) {
    super(repository);
  }

  findByProfile(profileId: number): Promise<AnnixOrbitIndividualDocument[]> {
    return this.repository.find({ where: { profileId } });
  }

  findByProfileOrdered(profileId: number): Promise<AnnixOrbitIndividualDocument[]> {
    return this.repository.find({
      where: { profileId },
      order: { uploadedAt: "DESC" },
    });
  }

  findByProfileAndKind(
    profileId: number,
    kind: IndividualDocumentKind,
  ): Promise<AnnixOrbitIndividualDocument | null> {
    return this.repository.findOne({ where: { profileId, kind } });
  }

  findByIdForProfile(
    documentId: number,
    profileId: number,
  ): Promise<AnnixOrbitIndividualDocument | null> {
    return this.repository.findOne({ where: { id: documentId, profileId } });
  }

  async deleteById(documentId: number): Promise<void> {
    await this.repository.delete(documentId);
  }

  async deleteByProfile(profileId: number): Promise<void> {
    await this.repository.delete({ profileId });
  }
}
