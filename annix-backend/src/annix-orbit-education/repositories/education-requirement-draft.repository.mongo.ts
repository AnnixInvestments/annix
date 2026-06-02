import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationRequirementDraft } from "../entities/education-requirement-draft.entity";
import {
  type DraftQuery,
  type DraftSource,
  EducationRequirementDraftRepository,
} from "./education-requirement-draft.repository";

@Injectable()
export class MongoEducationRequirementDraftRepository
  extends MongoCrudRepository<EducationRequirementDraft>
  implements EducationRequirementDraftRepository
{
  constructor(
    @InjectModel("EducationRequirementDraft", ORBIT_CONNECTION)
    model: Model<EducationRequirementDraft>,
  ) {
    super(model);
  }

  createMany(
    rows: Array<DeepPartial<EducationRequirementDraft>>,
  ): Promise<EducationRequirementDraft[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findMatching(query: DraftQuery): Promise<EducationRequirementDraft[]> {
    const filter: Record<string, unknown> = {};
    if (query.programmeId) {
      filter.programmeId = query.programmeId;
    }
    if (query.institutionId) {
      filter.institutionId = query.institutionId;
    }
    if (query.status) {
      filter.status = query.status;
    }
    const docs = await this.documents.find(filter).sort({ fetchedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForProgrammeYear(
    programmeId: string,
    intakeYear: number,
  ): Promise<EducationRequirementDraft[]> {
    const docs = await this.documents.find({ programmeId, intakeYear }).lean().exec();
    return this.toDomainList(docs);
  }

  async distinctSources(): Promise<DraftSource[]> {
    const groups = await this.documents
      .aggregate([
        {
          $group: {
            _id: {
              institutionId: "$institutionId",
              programmeId: "$programmeId",
              intakeYear: "$intakeYear",
              sourceUrl: "$sourceUrl",
            },
          },
        },
      ])
      .exec();
    return groups.map((group) => ({
      institutionId: group._id.institutionId ?? null,
      programmeId: group._id.programmeId ?? null,
      intakeYear: Number(group._id.intakeYear),
      sourceUrl: group._id.sourceUrl,
    }));
  }

  async deleteDraftsForSource(sourceUrl: string): Promise<void> {
    await this.documents.deleteMany({ sourceUrl, status: "draft" }).exec();
  }
}
