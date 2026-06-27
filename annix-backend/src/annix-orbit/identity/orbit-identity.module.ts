import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { IdentityRegistryRepository } from "./repositories/identity-registry.repository";
import { MongoIdentityRegistryRepository } from "./repositories/identity-registry.repository.mongo";
import { OrbitCompanyIdentityRepository } from "./repositories/orbit-company-identity.repository";
import { MongoOrbitCompanyIdentityRepository } from "./repositories/orbit-company-identity.repository.mongo";
import { OrbitRecruiterIdentityRepository } from "./repositories/orbit-recruiter-identity.repository";
import { MongoOrbitRecruiterIdentityRepository } from "./repositories/orbit-recruiter-identity.repository.mongo";
import { OrbitSeekerIdentityRepository } from "./repositories/orbit-seeker-identity.repository";
import { MongoOrbitSeekerIdentityRepository } from "./repositories/orbit-seeker-identity.repository.mongo";
import { OrbitStudentIdentityRepository } from "./repositories/orbit-student-identity.repository";
import { MongoOrbitStudentIdentityRepository } from "./repositories/orbit-student-identity.repository.mongo";
import { IdentityRegistryEntrySchema } from "./schemas/identity-registry-entry.schema";
import { OrbitCompanyIdentitySchema } from "./schemas/orbit-company-identity.schema";
import { OrbitRecruiterIdentitySchema } from "./schemas/orbit-recruiter-identity.schema";
import { OrbitSeekerIdentitySchema } from "./schemas/orbit-seeker-identity.schema";
import { OrbitStudentIdentitySchema } from "./schemas/orbit-student-identity.schema";

/**
 * S0 scaffold + S1/M0 (ADR-0001). Registers the four physically-separate Orbit
 * identity collections (shared `orbit_identity` id sequence) and the
 * `identity_registry` routing store, with their dual-driver repositories.
 * Intentionally NOT imported by `AppModule` or `AnnixOrbitModule` yet — this
 * slice is additive and runtime inert until a later slice wires it into the
 * login path.
 */
@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "OrbitCompanyIdentity", schema: OrbitCompanyIdentitySchema },
        { name: "OrbitSeekerIdentity", schema: OrbitSeekerIdentitySchema },
        { name: "OrbitRecruiterIdentity", schema: OrbitRecruiterIdentitySchema },
        { name: "OrbitStudentIdentity", schema: OrbitStudentIdentitySchema },
        { name: "IdentityRegistry", schema: IdentityRegistryEntrySchema },
      ],
      ORBIT_CONNECTION,
    ),
  ],
  providers: [
    repositoryProvider(OrbitCompanyIdentityRepository, MongoOrbitCompanyIdentityRepository),
    repositoryProvider(OrbitSeekerIdentityRepository, MongoOrbitSeekerIdentityRepository),
    repositoryProvider(OrbitRecruiterIdentityRepository, MongoOrbitRecruiterIdentityRepository),
    repositoryProvider(OrbitStudentIdentityRepository, MongoOrbitStudentIdentityRepository),
    repositoryProvider(IdentityRegistryRepository, MongoIdentityRegistryRepository),
  ],
  exports: [
    OrbitCompanyIdentityRepository,
    OrbitSeekerIdentityRepository,
    OrbitRecruiterIdentityRepository,
    OrbitStudentIdentityRepository,
    IdentityRegistryRepository,
  ],
})
export class OrbitIdentityModule {}
