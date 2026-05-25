import { ApiProperty } from "@nestjs/swagger";

export class AppAccessCountDto {
  @ApiProperty({ description: "App code", example: "rfq-platform" })
  appCode: string;

  @ApiProperty({ description: "App display name", example: "RFQ Platform" })
  appName: string;

  @ApiProperty({ description: "Number of UserAppAccess rows for this app" })
  accessCount: number;
}

export class ProfileCountDto {
  @ApiProperty({ description: "Portal / profile label", example: "Customer" })
  portal: string;

  @ApiProperty({ description: "Underlying table name", example: "customer_profiles" })
  table: string;

  @ApiProperty({ description: "Number of profile rows" })
  profileCount: number;
}

export class CoverageSectionDto {
  @ApiProperty({ description: "Total distinct core User rows" })
  totalCoreUsers: number;

  @ApiProperty({ type: [AppAccessCountDto], description: "UserAppAccess counts per app code" })
  accessByApp: AppAccessCountDto[];

  @ApiProperty({ type: [ProfileCountDto], description: "Profile counts per portal" })
  profilesByPortal: ProfileCountDto[];
}

export class IdentityRefDto {
  @ApiProperty({ description: "Core User id", example: 42 })
  userId: number;

  @ApiProperty({ description: "Email address (normalized for matching, original for display)" })
  email: string;
}

export class AnnixRepGapSectionDto {
  @ApiProperty({ description: "RepProfiles with no annix-rep UserAppAccess row" })
  missingAccessCount: number;

  @ApiProperty({ description: "Total RepProfiles inspected" })
  totalRepProfiles: number;

  @ApiProperty({ type: [IdentityRefDto], description: "Sample of affected {userId, email}" })
  sample: IdentityRefDto[];
}

export class StandaloneIdentityDto {
  @ApiProperty({ description: "Standalone table primary key" })
  standaloneId: number;

  @ApiProperty({ description: "Email on the standalone table" })
  email: string;

  @ApiProperty({ description: "Matching core User id when present", nullable: true })
  coreUserId: number | null;
}

export class TeacherAssistantSectionDto {
  @ApiProperty({ description: "Total teacher_assistant_users rows" })
  totalStandaloneUsers: number;

  @ApiProperty({ description: "Count whose email matches an existing core User (SSO risk)" })
  unlinkedDuplicateCount: number;

  @ApiProperty({ description: "Count with no matching core User (needs migrating)" })
  fullyStandaloneCount: number;

  @ApiProperty({ type: [StandaloneIdentityDto], description: "Sample of unlinked duplicates" })
  unlinkedDuplicateSample: StandaloneIdentityDto[];

  @ApiProperty({ type: [StandaloneIdentityDto], description: "Sample of fully standalone users" })
  fullyStandaloneSample: StandaloneIdentityDto[];
}

export class UnbridgedTableDto {
  @ApiProperty({ description: "Logical table label", example: "stock_control_users" })
  table: string;

  @ApiProperty({ description: "Count of rows whose email has no matching core User" })
  unbridgedCount: number;

  @ApiProperty({ description: "Total rows inspected on the table" })
  totalRows: number;

  @ApiProperty({ type: [StandaloneIdentityDto], description: "Sample of unbridged rows" })
  sample: StandaloneIdentityDto[];
}

export class UnbridgedLegacySectionDto {
  @ApiProperty({ type: [UnbridgedTableDto], description: "Per legacy table breakdown" })
  tables: UnbridgedTableDto[];
}

export class PerAppRoleDto {
  @ApiProperty({ description: "App code or standalone table label", example: "rfq-platform" })
  app: string;

  @ApiProperty({ description: "Effective role code for this email in this app", nullable: true })
  role: string | null;
}

export class PrivilegeConflictDto {
  @ApiProperty({ description: "Normalized email appearing across 2+ apps" })
  email: string;

  @ApiProperty({ type: [PerAppRoleDto], description: "Role per app for this email" })
  perApp: PerAppRoleDto[];
}

export class SameEmailDifferentPrivilegeSectionDto {
  @ApiProperty({ description: "Count of emails with differing roles across apps" })
  conflictCount: number;

  @ApiProperty({ type: [PrivilegeConflictDto], description: "Sample of privilege conflicts" })
  sample: PrivilegeConflictDto[];
}

export class IdentityReconciliationReportDto {
  @ApiProperty({ description: "When this report was computed (ISO 8601)" })
  generatedAt: string;

  @ApiProperty({ type: CoverageSectionDto })
  coverage: CoverageSectionDto;

  @ApiProperty({ type: AnnixRepGapSectionDto })
  annixRepGap: AnnixRepGapSectionDto;

  @ApiProperty({ type: TeacherAssistantSectionDto })
  teacherAssistant: TeacherAssistantSectionDto;

  @ApiProperty({ type: UnbridgedLegacySectionDto })
  unbridgedLegacy: UnbridgedLegacySectionDto;

  @ApiProperty({ type: SameEmailDifferentPrivilegeSectionDto })
  sameEmailDifferentPrivilege: SameEmailDifferentPrivilegeSectionDto;
}
