import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidates",
};

export default function CandidatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
