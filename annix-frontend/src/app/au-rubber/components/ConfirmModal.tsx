"use client";

import { ConfirmModal as SharedConfirmModal } from "@/app/components/modals/ConfirmModal";

type SharedProps = Parameters<typeof SharedConfirmModal>[0];

export function ConfirmModal(props: Omit<SharedProps, "cancelFocusRingClass">) {
  return <SharedConfirmModal {...props} cancelFocusRingClass="focus:ring-yellow-500" />;
}
