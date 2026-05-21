import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
