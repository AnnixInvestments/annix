export interface ResolvedAccessDetails {
  roleCode: string | null;
  roleName: string | null;
  permissions: string[];
  isAdmin: boolean;
  hasAccess: boolean;
}
