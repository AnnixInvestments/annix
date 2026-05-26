import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ScheduledJobOverride } from "../entities/scheduled-job-override.entity";
import {
  ScheduledJobOverrideInput,
  ScheduledJobOverrideRepository,
} from "./scheduled-job-override.repository";

@Injectable()
export class PostgresScheduledJobOverrideRepository implements ScheduledJobOverrideRepository {
  constructor(
    @InjectRepository(ScheduledJobOverride)
    private readonly repository: Repository<ScheduledJobOverride>,
  ) {}

  findAll(): Promise<ScheduledJobOverride[]> {
    return this.repository.find();
  }

  findByJobName(jobName: string): Promise<ScheduledJobOverride | null> {
    return this.repository.findOne({ where: { jobName } });
  }

  save(override: ScheduledJobOverrideInput): Promise<ScheduledJobOverride> {
    return this.repository.save(override);
  }
}
