export const rbacKeys = {
  all: ["rbac"] as const,
  apps: {
    all: ["rbac", "apps"] as const,
    list: () => [...rbacKeys.apps.all, "list"] as const,
    detail: (code: string) => [...rbacKeys.apps.all, "detail", code] as const,
    users: (code: string) => [...rbacKeys.apps.all, "users", code] as const,
  },
  users: {
    all: ["rbac", "users"] as const,
    list: () => [...rbacKeys.users.all, "list"] as const,
    search: (query: string) => [...rbacKeys.users.all, "search", query] as const,
  },
  roles: {
    all: ["rbac", "roles"] as const,
    detail: (roleId: number) => [...rbacKeys.roles.all, "detail", roleId] as const,
    products: (roleId: number) => [...rbacKeys.roles.all, "products", roleId] as const,
  },
} as const;
