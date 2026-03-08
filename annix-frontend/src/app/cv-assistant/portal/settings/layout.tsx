import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
