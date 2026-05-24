import { redirect } from "next/navigation";

export default function AnnixSentinelRoot() {
  redirect("/annix-sentinel/auth/login");
}
