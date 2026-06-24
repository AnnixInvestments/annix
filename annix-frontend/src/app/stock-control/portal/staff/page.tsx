import { redirect } from "next/navigation";

// The Staff tab was folded into the Resources hub to free up navbar space; its
// items (Staff Members, Staff Leave) now live under Resources. Anyone hitting
// the old /staff hub URL lands on the staff members list.
export default function StaffHubPage() {
  redirect("/stock-control/portal/staff/members");
}
