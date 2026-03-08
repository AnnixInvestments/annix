import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidates",
};

export default function CandidatesLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return children;
}
