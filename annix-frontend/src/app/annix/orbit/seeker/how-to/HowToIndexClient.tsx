"use client";

import {
  type AnnixOrbitHowToRole,
  CV_ASSISTANT_ADMIN_ROLE,
  CV_ASSISTANT_HOW_TO_ROLES,
} from "@/app/annix/orbit/how-to/types";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import SharedHowToIndexClient, {
  type HowToIndexClientProps as SharedProps,
} from "@/app/lib/how-to/components/HowToIndexClient";

type IndexGuideProp = SharedProps["guides"][number];

interface SeekerHowToIndexClientProps {
  guides: IndexGuideProp[];
}

export default function HowToIndexClient(props: SeekerHowToIndexClientProps) {
  const { user } = useAnnixOrbitAuth();
  const userRole = user?.role;
  const role =
    userRole && (CV_ASSISTANT_HOW_TO_ROLES as readonly string[]).includes(userRole)
      ? (userRole as AnnixOrbitHowToRole)
      : "seeker";

  return (
    <SharedHowToIndexClient
      guides={props.guides}
      role={role}
      allRoles={CV_ASSISTANT_HOW_TO_ROLES}
      adminRole={CV_ASSISTANT_ADMIN_ROLE}
      basePath="/annix/orbit/seeker/how-to"
      recentKey="annix-orbit-seeker-how-to-recent"
      subheading="Step-by-step guides for job seekers and FuturePath learners."
    />
  );
}
