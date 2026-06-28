import { toPairs as entries, isArray, isString } from "es-toolkit/compat";
import { redirect } from "next/navigation";

function queryString(searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  entries(searchParams).forEach(([key, value]) => {
    if (isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (isString(value)) {
      params.set(key, value);
    }
  });
  const value = params.toString();
  return value.length > 0 ? `?${value}` : "";
}

function auRubberPath(path: string[]): string {
  const joined = path.join("/");
  const mapped: Record<string, string> = {
    "rubber/compound-stock": "compound-stocks",
    "rubber/roll-stock": "roll-stock",
    "rubber/production": "productions",
    "rubber/supplier-cocs": "supplier-cocs",
    "rubber/au-cocs": "au-cocs",
    "compound-stock": "compound-stocks",
    production: "productions",
    "contacts/suppliers": "companies/suppliers",
    "contacts/customers": "companies/customers",
  };
  const route = mapped[joined];
  return route ?? joined;
}

export default async function CoreAuRubberFallbackPage(props: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const paramsPath = params.path;
  const path = paramsPath ?? [];
  redirect(`/au-rubber/portal/${auRubberPath(path)}${queryString(searchParams)}`);
}
