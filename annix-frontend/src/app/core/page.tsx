import type { Metadata } from "next";
import { CoreLoginForm } from "./CoreLoginForm";

export const metadata: Metadata = {
  title: "Annix Core",
  description:
    "The operations platform for stock, production, documents, quality, and delivery. Source, produce, track, and deliver.",
};

export default function AnnixCorePage() {
  return <CoreLoginForm />;
}
