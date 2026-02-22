import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Workflow - Annix",
  description: "Manage your Annix workflow and pipelines.",
};

export default function WorkflowLayout({ children }: { children: ReactNode }) {
  return children;
}
