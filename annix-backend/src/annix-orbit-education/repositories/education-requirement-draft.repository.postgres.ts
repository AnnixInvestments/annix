import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationRequirementDraft } from "../entities/education-requirement-draft.entity";
import {
  type DraftQuery,
  type DraftSource,
  EducationRequirementDraftRepository,
} from "./education-requirement-draft.repository";

@Injectable()
export class PostgresEducationRequirementDraftRepository
  extends TypeOrmCrudRepository<EducationRequirementDraft>
  implements EducationRequirementDraftRepository
{
  constructor(
    @InjectRepository(EducationRequirementDraft)
    repository: Repository<EducationRequirementDraft>,
  ) {
    super(repository);
  }

  createMany(
    rows: Array<DeepPartial<EducationRequirementDraft>>,
  ): Promise<EducationRequirementDraft[]> {
    const entities = rows.map((row) =>
      this.repository.create(row as TypeOrmDeepPartial<EducationRequirementDraft>),
    );
    return this.repository.save(entities);
  }

  findMatching(query: DraftQuery): Promise<EducationRequirementDraft[]> {
    const where: FindOptionsWhere<EducationRequirementDraft> = {};
    if (query.programmeId) {
      where.programmeId = query.programmeId;
    }
    if (query.institutionId) {
      where.institutionId = query.institutionId;
    }
    if (query.status) {
      where.status = query.status;
    }
    return this.repository.find({ where, order: { fetchedAt: "DESC" } });
  }

  findForProgrammeYear(
    programmeId: string,
    intakeYear: number,
  ): Promise<EducationRequirementDraft[]> {
    return this.repository.find({ where: { programmeId, intakeYear } });
  }

  async distinctSources(): Promise<DraftSource[]> {
    const rows = await this.repository
      .createQueryBuilder("draft")
      .select("draft.institution_id", "institutionId")
      .addSelect("draft.programme_id", "programmeId")
      .addSelect("draft.intake_year", "intakeYear")
      .addSelect("draft.source_url", "sourceUrl")
      .distinct(true)
      .getRawMany<{
        institutionId: string | null;
        programmeId: string | null;
        intakeYear: number;
        sourceUrl: string;
      }>();
    return rows.map((row) => ({
      institutionId: row.institutionId,
      programmeId: row.programmeId,
      intakeYear: Number(row.intakeYear),
      sourceUrl: row.sourceUrl,
    }));
  }

  async deleteDraftsForSource(sourceUrl: string): Promise<void> {
    await this.repository.delete({ sourceUrl, status: "draft" });
  }
}
