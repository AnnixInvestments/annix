import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { OrbitEarlyAccessSignup } from "../entities/orbit-early-access-signup.entity";
import { OrbitEarlyAccessSignupRepository } from "./orbit-early-access-signup.repository";

@Injectable()
export class PostgresOrbitEarlyAccessSignupRepository
  extends TypeOrmCrudRepository<OrbitEarlyAccessSignup>
  implements OrbitEarlyAccessSignupRepository
{
  constructor(
    @InjectRepository(OrbitEarlyAccessSignup) repository: Repository<OrbitEarlyAccessSignup>,
  ) {
    super(repository);
  }

  findByEmailNormalized(email: string): Promise<OrbitEarlyAccessSignup | null> {
    return this.repository.findOne({ where: { emailNormalized: email } });
  }

  findByMobileNormalized(mobile: string): Promise<OrbitEarlyAccessSignup | null> {
    return this.repository.findOne({ where: { mobileNormalized: mobile } });
  }

  findByReferralCode(code: string): Promise<OrbitEarlyAccessSignup | null> {
    return this.repository.findOne({ where: { referralCode: code } });
  }

  listNewestFirst(): Promise<OrbitEarlyAccessSignup[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }
}
