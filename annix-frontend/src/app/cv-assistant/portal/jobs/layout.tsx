import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs",
};

export default function JobsLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
