import { redirect } from "next/navigation";

// Orbit branding moved into the unified brand-keyed editor. Keep this path as a
// redirect so old links/bookmarks still work.
export default function OrbitBrandingRedirect() {
  redirect("/admin/portal/branding/annix-orbit");
}
