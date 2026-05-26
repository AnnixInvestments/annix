import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RfqDocument } from "./entities/rfq-document.entity";
import { RfqDocumentRepository } from "./rfq-document.repository";

@Injectable()
export class PostgresRfqDocumentRepository
  extends TypeOrmCrudRepository<RfqDocument>
  implements RfqDocumentRepository
{
  constructor(@InjectRepository(RfqDocument) repository: Repository<RfqDocument>) {
    super(repository);
  }

  findByRfqIdWithUploadedBy(rfqId: number): Promise<RfqDocument[]> {
    return this.repository.find({
      where: { rfq: { id: rfqId } },
      relations: ["uploadedBy"],
      order: { createdAt: "DESC" },
    });
  }

  findByIdWithRfqAndUploadedBy(documentId: number): Promise<RfqDocument | null> {
    return this.repository.findOne({
      where: { id: documentId },
      relations: ["rfq", "uploadedBy"],
    });
  }

  findByIdWithRfqCreatedBy(documentId: number): Promise<RfqDocument | null> {
    return this.repository.findOne({
      where: { id: documentId },
      relations: ["rfq", "rfq.createdBy"],
    });
  }
}
