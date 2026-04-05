export enum SharedDocumentType {
  SUPPLIER_INVOICE = "supplier_invoice",
  TAX_INVOICE = "tax_invoice",
  CREDIT_NOTE = "credit_note",
  DELIVERY_NOTE = "delivery_note",
  PURCHASE_ORDER = "purchase_order",
  ORDER = "order",
  SUPPLIER_CERTIFICATE = "supplier_certificate",
  COC = "coc",
  JOB_CARD_DRAWING = "job_card_drawing",
  SUPPORTING_DOCUMENT = "supporting_document",
  CV_APPLICATION = "cv_application",
  UNKNOWN = "unknown",
}

export type AppNamespace = "stock-control" | "au-rubber" | "cv-assistant";

export interface DocumentTypeMetadata {
  key: SharedDocumentType;
  label: string;
  description: string;
  namespaces: AppNamespace[];
}

export const DOCUMENT_TYPE_METADATA: Record<SharedDocumentType, DocumentTypeMetadata> = {
  [SharedDocumentType.SUPPLIER_INVOICE]: {
    key: SharedDocumentType.SUPPLIER_INVOICE,
    label: "Supplier Invoice",
    description:
      "Tax invoices or invoices from suppliers. Contains invoice number, line items, amounts, VAT.",
    namespaces: ["stock-control"],
  },
  [SharedDocumentType.TAX_INVOICE]: {
    key: SharedDocumentType.TAX_INVOICE,
    label: "Tax Invoice",
    description:
      "Tax invoices from suppliers or for customers. Contains invoice number, line items, amounts, VAT.",
    namespaces: ["au-rubber"],
  },
  [SharedDocumentType.CREDIT_NOTE]: {
    key: SharedDocumentType.CREDIT_NOTE,
    label: "Credit Note",
    description:
      'Credit notes from suppliers for returned goods. Document title says "CREDIT NOTE". Contains reference to original invoice, roll numbers being returned, credit amounts.',
    namespaces: ["au-rubber"],
  },
  [SharedDocumentType.DELIVERY_NOTE]: {
    key: SharedDocumentType.DELIVERY_NOTE,
    label: "Delivery Note",
    description:
      "Delivery notes, despatch notes, goods received documentation. Contains delivery date, quantities, item descriptions.",
    namespaces: ["stock-control", "au-rubber"],
  },
  [SharedDocumentType.PURCHASE_ORDER]: {
    key: SharedDocumentType.PURCHASE_ORDER,
    label: "Purchase Order",
    description:
      "Purchase orders placed to suppliers. Contains PO number, line items, quantities, pricing.",
    namespaces: ["stock-control"],
  },
  [SharedDocumentType.ORDER]: {
    key: SharedDocumentType.ORDER,
    label: "Order",
    description:
      "Purchase orders or compound orders. Contains order number, quantities, compound specifications.",
    namespaces: ["au-rubber"],
  },
  [SharedDocumentType.SUPPLIER_CERTIFICATE]: {
    key: SharedDocumentType.SUPPLIER_CERTIFICATE,
    label: "Supplier Certificate",
    description:
      "COC (Certificate of Conformance), COA (Certificate of Analysis), test certificates, material certificates. Contains batch numbers, test results, compliance statements.",
    namespaces: ["stock-control"],
  },
  [SharedDocumentType.COC]: {
    key: SharedDocumentType.COC,
    label: "Certificate of Conformance",
    description:
      "Certificate of Conformance from rubber compound suppliers (compounder or calenderer). Contains batch numbers, test results (Shore A, tensile, elongation, rheometer data), compound codes, roll numbers.",
    namespaces: ["au-rubber"],
  },
  [SharedDocumentType.JOB_CARD_DRAWING]: {
    key: SharedDocumentType.JOB_CARD_DRAWING,
    label: "Job Card Drawing",
    description: "Engineering drawings, technical specifications, fabrication details.",
    namespaces: ["stock-control"],
  },
  [SharedDocumentType.SUPPORTING_DOCUMENT]: {
    key: SharedDocumentType.SUPPORTING_DOCUMENT,
    label: "Supporting Document",
    description:
      "Amendments, correspondence, supporting documentation that doesn't fit other categories.",
    namespaces: ["stock-control"],
  },
  [SharedDocumentType.CV_APPLICATION]: {
    key: SharedDocumentType.CV_APPLICATION,
    label: "CV Application",
    description: "Curriculum vitae submission for a job opening.",
    namespaces: ["cv-assistant"],
  },
  [SharedDocumentType.UNKNOWN]: {
    key: SharedDocumentType.UNKNOWN,
    label: "Unknown",
    description: "Cannot confidently classify the document.",
    namespaces: ["stock-control", "au-rubber", "cv-assistant"],
  },
};

export function documentTypesForNamespace(namespace: AppNamespace): DocumentTypeMetadata[] {
  return Object.values(DOCUMENT_TYPE_METADATA).filter((meta) =>
    meta.namespaces.includes(namespace),
  );
}
