import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PollingJobOverride } from "../entities/polling-job-override.entity";
import { PollingJobOverrideRepository } from "./polling-job-override.repository";

@Injectable()
export class PostgresPollingJobOverrideRepository implements PollingJobOverrideRepository {
  constructor(
    @InjectRepository(PollingJobOverride)
    private readonly repository: Repository<PollingJobOverride>,
  ) {}

  findAll(): Promise<PollingJobOverride[]> {
    return this.repository.find();
  }

  save(override: PollingJobOverride): Promise<PollingJobOverride> {
    return this.repository.save(override);
  }
}
