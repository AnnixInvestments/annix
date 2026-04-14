import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inspection Response",
  description: "Respond to an inspection booking request",
};

export default function InspectionRespondLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
