"use client";

import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import {
  type AnnixOrbitHowToRole,
  CV_ASSISTANT_HOW_TO_ROLES,
} from "@/app/cv-assistant/how-to/types";
import type { HowToHeading, HowToLink } from "@/app/lib/how-to";
import SharedHowToViewerClient, {
  type ViewerGuide,
} from "@/app/lib/how-to/components/HowToViewerClient";

interface AnnixOrbitHowToViewerClientProps {
  guide: ViewerGuide;
  headings: HowToHeading[];
  prev: HowToLink | null;
  next: HowToLink | null;
}

export default function HowToViewerClient(props: AnnixOrbitHowToViewerClientProps) {
  const { user } = useAnnixOrbitAuth();
  const userRole = user?.role;
  const role =
    userRole && (CV_ASSISTANT_HOW_TO_ROLES as readonly string[]).includes(userRole)
      ? (userRole as AnnixOrbitHowToRole)
      : null;

  return (
    <SharedHowToViewerClient
      guide={props.guide}
      headings={props.headings}
      prev={props.prev}
      next={props.next}
      role={role}
      allRoles={CV_ASSISTANT_HOW_TO_ROLES}
      basePath="/cv-assistant/portal/how-to"
      recentKey="cv-assistant-how-to-recent"
      helpfulKeyPrefix="cv-assistant-how-to-helpful:"
    />
  );
}
