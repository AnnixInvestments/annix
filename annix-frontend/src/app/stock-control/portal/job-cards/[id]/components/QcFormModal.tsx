"use client";

import type { ReactNode } from "react";
import { FormModal } from "@/app/components/modals/FormModal";

interface QcFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  saveDisabled?: boolean;
  maxWidth?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function QcFormModal(props: QcFormModalProps) {
  const rawMaxWidth = props.maxWidth;
  const maxWidth = rawMaxWidth || "max-w-2xl";
  const rawSaveDisabled = props.saveDisabled;
  const saveDisabled = rawSaveDisabled || false;

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={props.onSave}
      title={props.title}
      submitLabel="Save"
      loading={props.saving}
      submitDisabled={saveDisabled}
      error={props.error}
      maxWidth={maxWidth}
      headerRight={props.headerRight}
    >
      {props.children}
    </FormModal>
  );
}
