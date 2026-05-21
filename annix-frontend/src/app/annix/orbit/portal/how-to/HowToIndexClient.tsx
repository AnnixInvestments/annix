"use client";

import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import {
  type AnnixOrbitHowToRole,
  CV_ASSISTANT_ADMIN_ROLE,
  CV_ASSISTANT_HOW_TO_ROLES,
} from "@/app/annix/orbit/how-to/types";
import SharedHowToIndexClient, {
  type HowToIndexClientProps as SharedProps,
} from "@/app/lib/how-to/components/HowToIndexClient";

type IndexGuideProp = SharedProps["guides"][number];

interface AnnixOrbitHowToIndexClientProps {
  guides: IndexGuideProp[];
}

export default function HowToIndexClient(props: AnnixOrbitHowToIndexClientProps) {
  const { user } = useAnnixOrbitAuth();
  const userRole = user?.role;
  const role =
    userRole && (CV_ASSISTANT_HOW_TO_ROLES as readonly string[]).includes(userRole)
      ? (userRole as AnnixOrbitHowToRole)
      : null;

  return (
    <SharedHowToIndexClient
      guides={props.guides}
      role={role}
      allRoles={CV_ASSISTANT_HOW_TO_ROLES}
      adminRole={CV_ASSISTANT_ADMIN_ROLE}
      basePath="/annix/orbit/portal/how-to"
      recentKey="annix-orbit-how-to-recent"
      subheading="Step-by-step guides for the Annix Orbit company portal. Tailored to your role."
    />
  );
}
