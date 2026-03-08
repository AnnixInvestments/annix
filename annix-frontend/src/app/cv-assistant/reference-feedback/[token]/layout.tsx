import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reference Feedback",
};

export default function ReferenceFeedbackLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
