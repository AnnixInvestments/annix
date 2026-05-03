"use client";

import { isArray } from "es-toolkit/compat";
import { useParams } from "next/navigation";
import { JobWizard } from "@/app/lib/cv-assistant/job-wizard";

export default function EditJobPostingPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const idValue = isArray(rawId) ? rawId[0] : rawId;
  const numericId = idValue ? Number(idValue) : null;
  const jobId = numericId && Number.isFinite(numericId) ? numericId : null;
  return <JobWizard jobId={jobId} />;
}
