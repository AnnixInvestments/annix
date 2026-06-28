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

export default async function CoreStockControlFallbackPage(props: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const paramsPath = params.path;
  const path = paramsPath ?? [];
  redirect(`/stock-control/portal/${path.join("/")}${queryString(searchParams)}`);
}
