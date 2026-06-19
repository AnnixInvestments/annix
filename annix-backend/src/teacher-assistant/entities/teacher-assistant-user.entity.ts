export class TeacherAssistantUser {
  id!: number;

  email!: string;

  passwordHash!: string;

  name!: string;

  schoolName!: string | null;

  // Core User anchor (issue #311 step 4.1). Links this standalone
  // Teacher Assistant account to a `teacher-assistant`-scoped row in
  // the universal `users` table so the identity is reconcilable and
  // RBAC-grantable. Nullable during the additive transition — login
  // still authenticates against this table, not the core user.
  userId!: number | null;

  createdAt!: Date;

  updatedAt!: Date;
}
