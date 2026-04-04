import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QCP Review",
  description: "External Quality Control Plan review",
};

export default function QcpReviewLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
