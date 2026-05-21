import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "References",
};

export default function ReferencesLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
