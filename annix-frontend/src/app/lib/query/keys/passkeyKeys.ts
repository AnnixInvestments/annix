export const passkeyKeys = {
  all: ["passkey"] as const,
  list: () => [...passkeyKeys.all, "list"] as const,
} as const;
