import type { NavItemDef } from "./navItems";

type ActionConfig = Record<string, string[]>;
type NavRbacConfig = Record<string, string[]>;

interface NavVisibilityRule {
  alwaysVisible?: boolean;
  actionKeys?: string[];
}

/**
 * RBAC v4 (issue #225): source of truth for deriving each nav item's visibility
 * from action permissions. Localised here so all rollback requires is flipping
 * RBAC_MODE back to "v2" — no edits to navItems.tsx needed.
 *
 * - `alwaysVisible: true` → visible to every role.
 * - `actionKeys: [...]`   → visible iff role has at least one of those actions.
 * - (not listed)          → fall through to the nav item's static `defaultRoles`
 *                           list (preserves existing behaviour for items we
 *                           haven't migrated yet).
 */
const NAV_VISIBILITY_RULES: Record<string, NavVisibilityRule> = {
  dashboard: { alwaysVisible: true },
  glossary: { alwaysVisible: true },
  "how-to": { alwaysVisible: true },
  notifications: { alwaysVisible: true },

  "inventory-stock": { alwaysVisible: true },
  "inventory-stock-value": { actionKeys: ["reports.view", "stock.adjustment"] },
  "inventory-import": { actionKeys: ["job-cards.import", "inventory.create"] },
  "inventory-identify": { alwaysVisible: true },
  returns: { alwaysVisible: true },
  "stock-take": { actionKeys: ["stock.adjustment"] },
  "stock-management-admin": {
    actionKeys: ["stock.adjustment", "inventory.create", "inventory.delete"],
  },

  "purchase-orders": { alwaysVisible: true },
  "job-cards": { alwaysVisible: true },
  "customer-deliveries": { alwaysVisible: true },
  quotations: { alwaysVisible: true },
  "customer-invoices": {
    actionKeys: [
      "invoices.approve",
      "invoices.delete",
      "invoices.price-adjust",
      "invoices.sage-export",
    ],
  },
  "customer-scorecard": { alwaysVisible: true },
  "customer-documents": { alwaysVisible: true },

  staff: { actionKeys: ["staff.manage"] },
  "staff-leave": { actionKeys: ["staff.manage"] },

  deliveries: { actionKeys: ["deliveries.delete"] },
  "issue-stock": { actionKeys: ["issuance.issue", "issuance.undo"] },
  requisitions: { alwaysVisible: true },
  invoices: {
    actionKeys: [
      "invoices.approve",
      "invoices.delete",
      "invoices.price-adjust",
      "invoices.sage-export",
    ],
  },
  "supplier-purchase-orders": { alwaysVisible: true },
  grns: { alwaysVisible: true },
  "supplier-scorecard": { alwaysVisible: true },
  "supplier-documents": { alwaysVisible: true },

  certificates: { actionKeys: ["certificates.upload", "certificates.delete"] },
  calibration: { actionKeys: ["certificates.upload", "certificates.delete"] },
  positector: {
    actionKeys: ["positector.upload-import", "positector.manage-devices", "positector.streaming"],
  },
  "positector-upload": { actionKeys: ["positector.upload-import"] },
  "positector-live": { actionKeys: ["positector.streaming"] },
  "positector-ble": { actionKeys: ["positector.manage-devices", "positector.streaming"] },
  "data-books": { alwaysVisible: true },
  "batch-lookup": { alwaysVisible: true },
  "paint-dfts": { actionKeys: ["qc.measurements"] },
  "blast-profile": { actionKeys: ["qc.measurements"] },
  "shore-hardness": { actionKeys: ["qc.measurements"] },
  environmental: { alwaysVisible: true },
  "qcp-log": { actionKeys: ["qc.measurements"] },
  "cpo-batch-approvals": { actionKeys: ["qc.measurements"] },

  reports: { actionKeys: ["reports.view"] },
};

export function deriveNavRbacConfig(
  navItems: NavItemDef[],
  actionConfig: ActionConfig,
  allRoleKeys: string[],
): NavRbacConfig {
  return navItems.reduce<NavRbacConfig>((acc, item) => {
    const rule = NAV_VISIBILITY_RULES[item.key];
    if (rule?.alwaysVisible) {
      acc[item.key] = [...allRoleKeys];
      return acc;
    }
    const actionKeys = rule?.actionKeys;
    if (actionKeys && actionKeys.length > 0) {
      const rolesWithAccess = allRoleKeys.filter((role) =>
        actionKeys.some((actionKey) => {
          const raw = actionConfig[actionKey];
          const list = raw || [];
          return list.includes(role);
        }),
      );
      acc[item.key] = rolesWithAccess;
      return acc;
    }
    acc[item.key] = [...item.defaultRoles];
    return acc;
  }, {});
}
