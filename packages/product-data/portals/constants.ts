export type PortalCode =
  | "marketing"
  | "admin"
  | "stock-control"
  | "comply-sa"
  | "fieldflow"
  | "annix-rep"
  | "cv-assistant"
  | "rfq"
  | "au-rubber"
  | "au-industries"
  | "teacher-assistant";

export interface PortalHost {
  readonly code: PortalCode;
  readonly displayName: string;
  readonly internalPathPrefix: string;
  readonly prodHost: string;
  readonly prodHostAliases: readonly string[];
  readonly devHost: string;
}

export const PORTAL_HOSTS: readonly PortalHost[] = [
  {
    code: "marketing",
    displayName: "Annix",
    internalPathPrefix: "/",
    prodHost: "annix.co.za",
    prodHostAliases: ["www.annix.co.za"],
    devHost: "localhost",
  },
  {
    code: "admin",
    displayName: "Platform Admin",
    internalPathPrefix: "/admin",
    prodHost: "admin.annix.co.za",
    prodHostAliases: [],
    devHost: "admin.localhost",
  },
  {
    code: "stock-control",
    displayName: "Stock Control",
    internalPathPrefix: "/stock-control",
    prodHost: "stockcontrol.annix.co.za",
    prodHostAliases: [],
    devHost: "stockcontrol.localhost",
  },
  {
    code: "comply-sa",
    displayName: "Comply SA",
    internalPathPrefix: "/comply-sa",
    prodHost: "complysa.annix.co.za",
    prodHostAliases: [],
    devHost: "complysa.localhost",
  },
  {
    code: "fieldflow",
    displayName: "FieldFlow",
    internalPathPrefix: "/fieldflow",
    prodHost: "fieldflow.annix.co.za",
    prodHostAliases: [],
    devHost: "fieldflow.localhost",
  },
  {
    code: "annix-rep",
    displayName: "Annix Rep",
    internalPathPrefix: "/annix-rep",
    prodHost: "annixrep.annix.co.za",
    prodHostAliases: [],
    devHost: "annixrep.localhost",
  },
  {
    code: "cv-assistant",
    displayName: "CV Assistant",
    internalPathPrefix: "/cv-assistant",
    prodHost: "cv.annix.co.za",
    prodHostAliases: [],
    devHost: "cv.localhost",
  },
  {
    code: "rfq",
    displayName: "RFQ",
    internalPathPrefix: "/rfq",
    prodHost: "rfq.annix.co.za",
    prodHostAliases: [],
    devHost: "rfq.localhost",
  },
  {
    code: "au-rubber",
    displayName: "AU Rubber",
    internalPathPrefix: "/au-rubber",
    prodHost: "aurubber.co.za",
    prodHostAliases: ["www.aurubber.co.za"],
    devHost: "aurubber.localhost",
  },
  {
    code: "au-industries",
    displayName: "AU Industries",
    internalPathPrefix: "/au-industries",
    prodHost: "auind.co.za",
    prodHostAliases: ["www.auind.co.za"],
    devHost: "auind.localhost",
  },
  {
    code: "teacher-assistant",
    displayName: "Teacher Assistant",
    internalPathPrefix: "/teacher-assistant",
    prodHost: "teacherassistant.annix.co.za",
    prodHostAliases: [],
    devHost: "teacherassistant.localhost",
  },
];

export const DEFAULT_DEV_PORT = 3000;

const PORT_SUFFIX_RE = /:\d+$/;

export function normaliseHost(rawHost: string): string {
  return rawHost.toLowerCase().replace(PORT_SUFFIX_RE, "").trim();
}

export function portalForHost(rawHost: string | null | undefined): PortalHost | null {
  if (!rawHost) return null;
  const host = normaliseHost(rawHost);
  const match = PORTAL_HOSTS.find(
    (portal) =>
      portal.prodHost === host || portal.devHost === host || portal.prodHostAliases.includes(host),
  );
  return match ?? null;
}

export function portalForCode(code: PortalCode): PortalHost {
  const match = PORTAL_HOSTS.find((portal) => portal.code === code);
  if (!match) throw new Error(`Unknown portal code: ${code}`);
  return match;
}

export function isAliasHost(rawHost: string | null | undefined): boolean {
  if (!rawHost) return false;
  const host = normaliseHost(rawHost);
  return PORTAL_HOSTS.some((portal) => portal.prodHostAliases.includes(host));
}

export function canonicalHostFor(rawHost: string | null | undefined): string | null {
  const match = portalForHost(rawHost);
  return match ? match.prodHost : null;
}

export function corsOriginsFor(
  env: "dev" | "prod" | "all",
  devPort: number = DEFAULT_DEV_PORT,
): string[] {
  const includeDev = env !== "prod";
  const includeProd = env !== "dev";
  const devOrigins = includeDev
    ? PORTAL_HOSTS.map((portal) => `http://${portal.devHost}:${devPort}`)
    : [];
  const prodOrigins = includeProd
    ? PORTAL_HOSTS.flatMap((portal) => [
        `https://${portal.prodHost}`,
        ...portal.prodHostAliases.map((alias) => `https://${alias}`),
      ])
    : [];
  return [...devOrigins, ...prodOrigins];
}
