"use client";

import { ConfirmModal } from "@/app/components/modals/ConfirmModal";

export interface MissingDocsWarningModalProps {
  isOpen: boolean;
  missingQualifications: boolean;
  missingCertificates: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MissingDocsWarningModal(props: MissingDocsWarningModalProps) {
  const missingItems = [
    props.missingQualifications ? "qualifications" : null,
    props.missingCertificates ? "certificates" : null,
  ].filter((item): item is string => item !== null);
  const missingList = missingItems.join(" and ");

  const onAddDocuments = props.onCancel;
  const onContinueAnyway = props.onConfirm;

  return (
    <ConfirmModal
      isOpen={props.isOpen}
      variant="info"
      title="Match accuracy may be reduced"
      message={`You have not uploaded any ${missingList}. Job matches will still work, but they will be less accurate without this information. You can add these documents at any time from this page.`}
      confirmLabel="Add documents"
      cancelLabel="Continue anyway"
      onConfirm={onAddDocuments}
      onCancel={onContinueAnyway}
    />
  );
}
