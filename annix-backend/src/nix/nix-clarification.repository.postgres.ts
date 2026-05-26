import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ClarificationStatus, NixClarification } from "./entities/nix-clarification.entity";
import { NixClarificationRepository } from "./nix-clarification.repository";

@Injectable()
export class PostgresNixClarificationRepository
  extends TypeOrmCrudRepository<NixClarification>
  implements NixClarificationRepository
{
  constructor(@InjectRepository(NixClarification) repository: Repository<NixClarification>) {
    super(repository);
  }

  findByIdWithExtraction(id: number): Promise<NixClarification | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["extraction"],
    });
  }

  countPendingForExtraction(extractionId: number | undefined): Promise<number> {
    return this.repository.count({
      where: {
        extractionId,
        status: ClarificationStatus.PENDING,
      },
    });
  }

  findPendingForExtractionOrdered(extractionId: number): Promise<NixClarification[]> {
    return this.repository.find({
      where: {
        extractionId,
        status: ClarificationStatus.PENDING,
      },
      order: { createdAt: "ASC" },
    });
  }
}
