import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnnixOrbitProfile } from "../annix-orbit/entities/annix-orbit-profile.entity";
import { AnnixOrbitUser } from "../annix-orbit/entities/annix-orbit-user.entity";
import { RepProfile } from "../annix-rep/rep-profile/rep-profile.entity";
import { AnnixSentinelProfile } from "../annix-sentinel/companies/entities/annix-sentinel-profile.entity";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { nowISO } from "../lib/datetime";
import { App } from "../rbac/entities/app.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { StockControlProfile } from "../stock-control/entities/stock-control-profile.entity";
import { StockControlUser } from "../stock-control/entities/stock-control-user.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { TeacherAssistantUser } from "../teacher-assistant/entities/teacher-assistant-user.entity";
import { User } from "../user/entities/user.entity";
import {
  AnnixRepGapSectionDto,
  CoverageSectionDto,
  IdentityReconciliationReportDto,
  PerAppRoleDto,
  SameEmailDifferentPrivilegeSectionDto,
  StandaloneIdentityDto,
  TeacherAssistantSectionDto,
  UnbridgedLegacySectionDto,
  UnbridgedTableDto,
} from "./dto/identity-reconciliation-report.dto";

const SAMPLE_LIMIT = 25;
const ANNIX_REP_APP_CODE = "annix-rep";

interface CoreUserRef {
  id: number;
  email: string;
}

@Injectable()
export class IdentityReconciliationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(UserAppAccess)
    private readonly accessRepo: Repository<UserAppAccess>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepo: Repository<SupplierProfile>,
    @InjectRepository(StockControlProfile)
    private readonly stockControlProfileRepo: Repository<StockControlProfile>,
    @InjectRepository(AnnixOrbitProfile)
    private readonly annixOrbitProfileRepo: Repository<AnnixOrbitProfile>,
    @InjectRepository(AnnixSentinelProfile)
    private readonly annixSentinelProfileRepo: Repository<AnnixSentinelProfile>,
    @InjectRepository(RepProfile)
    private readonly repProfileRepo: Repository<RepProfile>,
    @InjectRepository(TeacherAssistantUser)
    private readonly teacherAssistantUserRepo: Repository<TeacherAssistantUser>,
    @InjectRepository(StockControlUser)
    private readonly stockControlUserRepo: Repository<StockControlUser>,
    @InjectRepository(AnnixOrbitUser)
    private readonly annixOrbitUserRepo: Repository<AnnixOrbitUser>,
  ) {}

  async buildReport(): Promise<IdentityReconciliationReportDto> {
    const coreUsers = await this.userRepo.find({ select: ["id", "email"] });
    const coreUsersByEmail = this.indexCoreUsersByEmail(coreUsers);

    const coverage = await this.coverageSection(coreUsers.length);
    const annixRepGap = await this.annixRepGapSection();
    const teacherAssistant = await this.teacherAssistantSection(coreUsersByEmail);
    const unbridgedLegacy = await this.unbridgedLegacySection(coreUsersByEmail);
    const sameEmailDifferentPrivilege = await this.sameEmailDifferentPrivilegeSection(coreUsers);

    return {
      generatedAt: nowISO(),
      coverage,
      annixRepGap,
      teacherAssistant,
      unbridgedLegacy,
      sameEmailDifferentPrivilege,
    };
  }

  private normalizeEmail(email: string | null | undefined): string | null {
    if (!email) {
      return null;
    }
    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private indexCoreUsersByEmail(coreUsers: CoreUserRef[]): Map<string, CoreUserRef> {
    return coreUsers.reduce((acc, user) => {
      const normalized = this.normalizeEmail(user.email);
      if (normalized && !acc.has(normalized)) {
        acc.set(normalized, user);
      }
      return acc;
    }, new Map<string, CoreUserRef>());
  }

  private async coverageSection(totalCoreUsers: number): Promise<CoverageSectionDto> {
    const apps = await this.appRepo.find({ order: { displayOrder: "ASC" } });

    const accessByApp = await Promise.all(
      apps.map(async (app) => {
        const accessCount = await this.accessRepo.count({ where: { appId: app.id } });
        return { appCode: app.code, appName: app.name, accessCount };
      }),
    );

    const profilesByPortal = await Promise.all([
      this.profileCount("Customer", "customer_profiles", this.customerProfileRepo),
      this.profileCount("Supplier", "supplier_profiles", this.supplierProfileRepo),
      this.profileCount("Stock Control", "stock_control_profiles", this.stockControlProfileRepo),
      this.profileCount("Annix Orbit", "cv_assistant_profiles", this.annixOrbitProfileRepo),
      this.profileCount("Annix Sentinel", "comply_sa_profiles", this.annixSentinelProfileRepo),
      this.profileCount("Annix Rep", "annix_rep_rep_profiles", this.repProfileRepo),
    ]);

    return { totalCoreUsers, accessByApp, profilesByPortal };
  }

  private async profileCount(
    portal: string,
    table: string,
    repo: Repository<object>,
  ): Promise<{ portal: string; table: string; profileCount: number }> {
    const profileCount = await repo.count();
    return { portal, table, profileCount };
  }

  private async annixRepGapSection(): Promise<AnnixRepGapSectionDto> {
    const repApp = await this.appRepo.findOne({ where: { code: ANNIX_REP_APP_CODE } });
    const repProfiles = await this.repProfileRepo.find({
      relations: ["user"],
      order: { id: "ASC" },
    });

    if (!repApp) {
      const sampleNoApp = repProfiles.slice(0, SAMPLE_LIMIT).map((profile) => ({
        userId: profile.userId,
        email: profile.user?.email ?? "",
      }));
      return {
        missingAccessCount: repProfiles.length,
        totalRepProfiles: repProfiles.length,
        sample: sampleNoApp,
      };
    }

    const repAccess = await this.accessRepo.find({ where: { appId: repApp.id } });
    const userIdsWithAccess = repAccess.reduce(
      (acc, access) => acc.add(access.userId),
      new Set<number>(),
    );

    const missing = repProfiles.filter((profile) => !userIdsWithAccess.has(profile.userId));

    const sample = missing.slice(0, SAMPLE_LIMIT).map((profile) => ({
      userId: profile.userId,
      email: profile.user?.email ?? "",
    }));

    return {
      missingAccessCount: missing.length,
      totalRepProfiles: repProfiles.length,
      sample,
    };
  }

  private async teacherAssistantSection(
    coreUsersByEmail: Map<string, CoreUserRef>,
  ): Promise<TeacherAssistantSectionDto> {
    const teacherUsers = await this.teacherAssistantUserRepo.find({ order: { id: "ASC" } });

    const classified = teacherUsers.reduce(
      (acc, teacherUser) => {
        const normalized = this.normalizeEmail(teacherUser.email);
        const coreMatch = normalized ? (coreUsersByEmail.get(normalized) ?? null) : null;
        const ref: StandaloneIdentityDto = {
          standaloneId: teacherUser.id,
          email: teacherUser.email,
          coreUserId: coreMatch ? coreMatch.id : null,
        };
        if (coreMatch) {
          acc.unlinkedDuplicates.push(ref);
        } else {
          acc.fullyStandalone.push(ref);
        }
        return acc;
      },
      {
        unlinkedDuplicates: [] as StandaloneIdentityDto[],
        fullyStandalone: [] as StandaloneIdentityDto[],
      },
    );

    return {
      totalStandaloneUsers: teacherUsers.length,
      unlinkedDuplicateCount: classified.unlinkedDuplicates.length,
      fullyStandaloneCount: classified.fullyStandalone.length,
      unlinkedDuplicateSample: classified.unlinkedDuplicates.slice(0, SAMPLE_LIMIT),
      fullyStandaloneSample: classified.fullyStandalone.slice(0, SAMPLE_LIMIT),
    };
  }

  private async unbridgedLegacySection(
    coreUsersByEmail: Map<string, CoreUserRef>,
  ): Promise<UnbridgedLegacySectionDto> {
    const stockControlTable = await this.unbridgedTable(
      "stock_control_users",
      coreUsersByEmail,
      this.stockControlUserRepo,
    );
    const annixOrbitTable = await this.unbridgedTable(
      "cv_assistant_users",
      coreUsersByEmail,
      this.annixOrbitUserRepo,
    );

    return { tables: [stockControlTable, annixOrbitTable] };
  }

  private async unbridgedTable(
    table: string,
    coreUsersByEmail: Map<string, CoreUserRef>,
    repo: Repository<{ id: number; email: string }>,
  ): Promise<UnbridgedTableDto> {
    const rows = await repo.find({ order: { id: "ASC" } });

    const unbridged = rows.reduce((acc, row) => {
      const normalized = this.normalizeEmail(row.email);
      const coreMatch = normalized ? (coreUsersByEmail.get(normalized) ?? null) : null;
      if (!coreMatch) {
        acc.push({ standaloneId: row.id, email: row.email, coreUserId: null });
      }
      return acc;
    }, [] as StandaloneIdentityDto[]);

    return {
      table,
      unbridgedCount: unbridged.length,
      totalRows: rows.length,
      sample: unbridged.slice(0, SAMPLE_LIMIT),
    };
  }

  private async sameEmailDifferentPrivilegeSection(
    coreUsers: CoreUserRef[],
  ): Promise<SameEmailDifferentPrivilegeSectionDto> {
    const rolesByEmail = await this.collectRolesByEmail(coreUsers);

    const conflicts = [...rolesByEmail.entries()].reduce(
      (acc, [email, perAppMap]) => {
        const perApp = [...perAppMap.entries()].map(([app, role]) => ({ app, role }));
        const distinctRoles = perApp.reduce(
          (roleSet, entry) => roleSet.add(entry.role ?? "<none>"),
          new Set<string>(),
        );
        if (perApp.length >= 2 && distinctRoles.size >= 2) {
          acc.push({ email, perApp });
        }
        return acc;
      },
      [] as { email: string; perApp: PerAppRoleDto[] }[],
    );

    return {
      conflictCount: conflicts.length,
      sample: conflicts.slice(0, SAMPLE_LIMIT),
    };
  }

  private async collectRolesByEmail(
    coreUsers: CoreUserRef[],
  ): Promise<Map<string, Map<string, string | null>>> {
    const coreUserById = coreUsers.reduce(
      (acc, user) => acc.set(user.id, user),
      new Map<number, CoreUserRef>(),
    );

    const rolesByEmail = new Map<string, Map<string, string | null>>();

    const recordRole = (
      rawEmail: string | null | undefined,
      app: string,
      role: string | null,
    ): void => {
      const normalized = this.normalizeEmail(rawEmail);
      if (!normalized) {
        return;
      }
      const existing = rolesByEmail.get(normalized) ?? new Map<string, string | null>();
      if (!existing.has(app)) {
        existing.set(app, role);
      }
      rolesByEmail.set(normalized, existing);
    };

    const accessRecords = await this.accessRepo.find({ relations: ["app", "role"] });
    accessRecords.forEach((access) => {
      const coreUser = coreUserById.get(access.userId);
      const appCode = access.app?.code ?? null;
      if (coreUser && appCode) {
        recordRole(coreUser.email, appCode, access.role?.code ?? null);
      }
    });

    const teacherUsers = await this.teacherAssistantUserRepo.find();
    teacherUsers.forEach((teacherUser) => {
      recordRole(teacherUser.email, "teacher-assistant", null);
    });

    const stockControlUsers = await this.stockControlUserRepo.find();
    stockControlUsers.forEach((scUser) => {
      recordRole(scUser.email, "stock-control:legacy", scUser.role ?? null);
    });

    const annixOrbitUsers = await this.annixOrbitUserRepo.find();
    annixOrbitUsers.forEach((orbitUser) => {
      recordRole(orbitUser.email, "annix-orbit:legacy", orbitUser.role ?? null);
    });

    return rolesByEmail;
  }
}
