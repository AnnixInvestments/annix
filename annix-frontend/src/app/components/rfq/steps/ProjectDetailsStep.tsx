"use client";

import { isNumber, keys } from "es-toolkit/compat";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import GoogleMapLocationPicker from "@/app/components/GoogleMapLocationPicker";
import AddMineModal from "@/app/components/rfq/modals/AddMineModal";
import { AutoFilledInput } from "@/app/components/rfq/shared/AutoFilledField";
import EnvironmentalIntelligenceSection from "@/app/components/rfq/steps/EnvironmentalIntelligenceSection";
import { useToast } from "@/app/components/Toast";
import { DocumentBucket } from "@/app/components/uploads";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { minesApi, SaMine } from "@/app/lib/api/client";
import {
  isProductAvailableForUnregistered,
  isProductComingSoon,
  isProjectTypeAvailableForUnregistered,
  PRODUCTS_AND_SERVICES,
  PROJECT_TYPES,
} from "@/app/lib/config/productsServices";
import { generateUniqueId } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useEnvironmentalIntelligence } from "@/app/lib/hooks/useEnvironmentalIntelligence";
import { log } from "@/app/lib/logger";
import {
  classifyDroppedFile,
  type EmailAttachment,
  type EmailMetadata,
  parseEmail,
} from "@/app/lib/nix";
import {
  type NixDocumentRole,
  type NixExtractedItem,
  type NixExtractionMetadata,
  type NixRfqPipingProfileMetadata,
  nixApi,
} from "@/app/lib/nix/api";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { generateSystemReferenceNumber } from "@/app/lib/utils/systemUtils";
import { BUNDLE_KEY_TO_PRODUCT, GOOGLE_MAPS_API_KEY } from "./project-details/constants";
import { detectProjectTypeFromEmail, isExcelFile } from "./project-details/helpers";
import { RestrictionTooltip } from "./project-details/RestrictionTooltip";
import type { RestrictionPopupPosition } from "./project-details/types";
import {
  buildFallbackEnvironmentalSpecs,
  FALLBACK_ENVIRONMENTAL_AUTO_FILLED_FIELDS,
  fallbackMines,
} from "./projectDetailsFallbackData";
import { UnifiedRfqDocumentBucket } from "./UnifiedRfqDocumentBucket";

export type { PendingDocument } from "@/app/lib/store/rfqWizardStore";

export default function ProjectDetailsStep() {
  const nixStopUsing = useRfqWizardStore((s) => s.nixStopUsing);
  const nixProcessDocuments = useRfqWizardStore((s) => s.nixProcessDocuments);
  const isNixProcessing = useRfqWizardStore((s) => s.isNixProcessing);
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const errors = useRfqWizardStore((s) => s.validationErrors);
  const pendingDocuments = useRfqWizardStore((s) => s.pendingDocuments);
  const pendingTenderDocuments = useRfqWizardStore((s) => s.pendingTenderDocuments);
  const onUpdate = useRfqWizardStore((s) => s.updateRfqField) as (
    field: string,
    value: any,
  ) => void;
  const onSetValidationError = useRfqWizardStore((s) => s.setValidationError);
  const onUpdateGlobalSpecs = useRfqWizardStore((s) => s.updateGlobalSpecs) as (specs: any) => void;
  const storeAddDocument = useRfqWizardStore((s) => s.addDocument);
  const onRemoveDocument = useRfqWizardStore((s) => s.removeDocument);
  const storeAddTenderDocument = useRfqWizardStore((s) => s.addTenderDocument);
  const { flags: featureFlags } = useFeatureFlags();
  const onRemoveTenderDocument = useRfqWizardStore((s) => s.removeTenderDocument);
  const currentDraftId = useRfqWizardStore((s) => s.currentDraftId);
  const setWizardCurrentStep = useRfqWizardStore((s) => s.setCurrentStep);
  const applyNixItemsToRfq = useRfqWizardStore((s) => s.applyNixItemsToRfq);
  const globalSpecs = rfqData.globalSpecs;
  const useNix = rfqData.useNix;
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();
  // Hoisted up here (was further down) so onAddDocument's email-metadata
  // auto-fill branch can compare current customer-field values against the
  // logged-in user's profile defaults.
  const {
    isAuthenticated: isCustomerAuthenticated,
    isLoading: isCustomerAuthLoading,
    customer,
    profile,
  } = useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();

  // Surface from the latest email drop so a follow-up useEffect can run
  // mine-name detection once the mines list has loaded. Decoupled from
  // onAddDocument so we don't have to re-memoise the callback when mines
  // load asynchronously after first render.
  const [emailLocationSearchText, setEmailLocationSearchText] = useState<string | null>(null);
  const [showLocationRequiredModal, setShowLocationRequiredModal] = useState(false);
  // Pending mine choice inside LocationRequiredModal — the dropdown only
  // stages a selection here; the "Accept this location" button is what
  // actually commits via handleMineSelect.
  const [pendingMineSelection, setPendingMineSelection] = useState<number | null>(null);

  const [boqExtractionSummary, setBoqExtractionSummary] = useState<{
    fileName: string;
    itemCount: number;
    bundleCount: number;
    duplicateCount: number;
    drawingRefCount: number;
  } | null>(null);

  // Track which customer fields were auto-filled (declared early because
  // onAddDocument's email-metadata branch overwrites them). Mirror state is
  // updated again below from the logged-in-user useEffect.
  const [customerAutoFilled, setCustomerAutoFilled] = useState<{
    customerName: boolean;
    customerEmail: boolean;
    customerPhone: boolean;
  }>({
    customerName: false,
    customerEmail: false,
    customerPhone: false,
  });

  // Sequential queue for Nix extractions so multiple Excel files
  // dropped at once spool through the backend one at a time rather
  // than firing in parallel and surfacing duplicate progress modals.
  // The chain tail tracks the in-flight + queued tasks; new arrivals
  // attach to it and become the new tail.
  const nixExtractionQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const runNixBoqExtraction = useCallback(
    async (
      file: File,
    ): Promise<{
      profile: NixRfqPipingProfileMetadata | null;
      items: NixExtractedItem[];
      metadata: NixExtractionMetadata | null;
    } | null> => {
      // Spool: every call grabs the queue's current tail, awaits it,
      // then replaces the tail with a new promise resolving on its
      // own completion. End result — Nix extractions run strictly
      // one-at-a-time even when a customer drops 30 docs at once.
      const priorTail = nixExtractionQueueRef.current;
      let releaseQueueSlot: () => void = () => {};
      nixExtractionQueueRef.current = new Promise<void>((resolve) => {
        releaseQueueSlot = resolve;
      });
      try {
        await priorTail;
      } catch {
        // Don't propagate a prior task's failure into the next task.
      }
      showExtraction({
        brand: "rfq",
        label: `Nix is reading ${file.name} and splitting it into line items…`,
        estimatedDurationMs: 30_000,
      });
      try {
        const result = await nixApi.uploadAndProcess(file, {
          extractionProfile: "rfq-piping",
          documentRole: "drawing",
          rfqId: currentDraftId ?? undefined,
          sourceModule: "rfq",
        });
        hideExtraction();
        if (result.error) {
          const wantsRetry = !(await confirm({
            title: "Nix extraction failed",
            message: `Couldn't extract ${file.name}.\n\n${result.error}`,
            variant: "warning",
            confirmLabel: "Got it",
            cancelLabel: "Retry extraction",
          }));
          if (wantsRetry) {
            releaseQueueSlot();
            return await runNixBoqExtraction(file);
          }
          return null;
        }
        const rawProfile = result.profileMetadata as NixRfqPipingProfileMetadata | undefined;
        const profile = rawProfile ?? null;
        const rawItems = result.items;
        const items = rawItems || [];
        const itemCount = items.length;
        const rawMetadata = result.metadata;
        const metadata = rawMetadata ?? null;
        const bundles = profile ? profile.supplierBundles : null;
        const bundleCount = bundles ? bundles.length : 0;
        const duplicates = profile ? profile.duplicates : null;
        const duplicateCount = duplicates ? duplicates.length : 0;
        const drawingRefs = profile ? profile.drawingReferences : null;
        const drawingRefCount = drawingRefs ? drawingRefs.length : 0;
        setBoqExtractionSummary({
          fileName: file.name,
          itemCount,
          bundleCount,
          duplicateCount,
          drawingRefCount,
        });
        return { profile, items, metadata };
      } catch (err) {
        hideExtraction();
        log.error("Nix BOQ extraction failed:", err);
        const wantsRetry = !(await confirm({
          title: "Couldn't auto-extract this BOQ",
          message:
            `${file.name} is still uploaded — admin can extract it manually after submission.\n\n` +
            "Common cause: the backend was still starting up when the extraction ran. " +
            "If you've waited a few seconds, hit Retry — your document is still in the upload queue and won't be re-uploaded.",
          variant: "warning",
          confirmLabel: "Got it",
          cancelLabel: "Retry extraction",
        }));
        if (wantsRetry) {
          // Release the slot BEFORE re-queueing so the retry doesn't
          // deadlock waiting on its own ancestor in the chain.
          releaseQueueSlot();
          return await runNixBoqExtraction(file);
        }
        return null;
      } finally {
        releaseQueueSlot();
      }
    },
    [showExtraction, hideExtraction, confirm, currentDraftId],
  );

  const applyEmailMetadataToCustomerFields = useCallback(
    (
      metadata: EmailMetadata,
    ): {
      name: boolean;
      email: boolean;
      phone: boolean;
      description: boolean;
      projectName: boolean;
      projectType: string | null;
      additionalContacts: boolean;
    } => {
      const applied = {
        name: false,
        email: false,
        phone: false,
        description: false,
        projectName: false,
        projectType: null as string | null,
        additionalContacts: false,
      };

      // Profile defaults — overwriting these is safe because they're auto-fill
      // from the logged-in user, not anything the customer manually typed.
      const profileFirst = profile ? profile.firstName : null;
      const profileLast = profile ? profile.lastName : null;
      const profileFullName = [profileFirst, profileLast].filter(Boolean).join(" ");
      const profileEmailRaw = profile ? profile.email : null;
      const profileEmail = profileEmailRaw || "";
      const profileMobile = profile ? profile.mobilePhone : null;
      const profileDirect = profile ? profile.directPhone : null;
      const profileCompany = profile ? profile.company : null;
      const profileCompanyPhone = profileCompany ? profileCompany.primaryPhone : null;
      const profilePhone = profileMobile || profileDirect || profileCompanyPhone || "";

      const canOverwrite = (
        current: string | undefined,
        autoFlag: boolean,
        profileDefault: string,
      ): boolean => {
        if (!current) return true;
        if (autoFlag) return true;
        if (profileDefault && current === profileDefault) return true;
        return false;
      };

      const fromName = metadata.fromName;
      if (
        fromName &&
        canOverwrite(rfqData.customerName, customerAutoFilled.customerName, profileFullName)
      ) {
        onUpdate("customerName", fromName);
        applied.name = true;
      }
      const fromEmail = metadata.fromEmail;
      if (
        fromEmail &&
        canOverwrite(rfqData.customerEmail, customerAutoFilled.customerEmail, profileEmail)
      ) {
        onUpdate("customerEmail", fromEmail);
        applied.email = true;
      }
      const fromPhone = metadata.fromPhone;
      if (
        fromPhone &&
        canOverwrite(rfqData.customerPhone, customerAutoFilled.customerPhone, profilePhone)
      ) {
        onUpdate("customerPhone", fromPhone);
        applied.phone = true;
      }

      const subject = metadata.subject;
      const cleanedSubject = subject ? subject.replace(/\.[a-z0-9]{1,5}$/i, "").trim() : "";
      const currentDescription = rfqData.description;
      if (cleanedSubject && !currentDescription) {
        onUpdate("description", cleanedSubject);
        applied.description = true;
      }

      // Project Name — overwrite when empty OR still showing the auto-gen
      // RFQ-YYYY-NNN placeholder set by the auto-generate useEffect.
      const currentProjectName = rfqData.projectName;
      const isAutoGenProjectName = currentProjectName
        ? /^RFQ-\d{4}-\d+$/.test(currentProjectName)
        : true;
      if (cleanedSubject && (!currentProjectName || isAutoGenProjectName)) {
        onUpdate("projectName", cleanedSubject);
        applied.projectName = true;
      }

      const currentProjectType = rfqData.projectType;
      if (!currentProjectType) {
        const detectedType = detectProjectTypeFromEmail(metadata.subject, metadata.bodyText);
        // Set the value but DON'T trigger the useNix flip the radio's onChange
        // does — we already ran our own extraction via the BOQ dropzone, so
        // we don't want to also push the user into the heavier nixProcessDocuments
        // tender flow. If they later click a different radio manually, that
        // handler still fires and can flip useNix.
        onUpdate("projectType", detectedType);
        applied.projectType = detectedType;
      }

      // Additional Contacts field — populate from CC list + signature alt
      // emails when the customer hasn't already typed something in.
      const ccList = metadata.ccList;
      const signatureAlts = metadata.signatureEmails;
      const allAdditional = [...ccList, ...signatureAlts];
      const currentAdditional = rfqData.additionalContacts;
      if (allAdditional.length > 0 && !currentAdditional) {
        onUpdate("additionalContacts", allAdditional.join(", "));
        applied.additionalContacts = true;
      }

      const appliedName = applied.name;
      const appliedEmail = applied.email;
      const appliedPhone = applied.phone;
      const anyApplied = appliedName || appliedEmail || appliedPhone;
      if (anyApplied) {
        setCustomerAutoFilled((prev) => {
          const prevName = prev.customerName;
          const prevEmail = prev.customerEmail;
          const prevPhone = prev.customerPhone;
          return {
            ...prev,
            customerName: appliedName || prevName,
            customerEmail: appliedEmail || prevEmail,
            customerPhone: appliedPhone || prevPhone,
          };
        });
      }
      return applied;
    },
    [
      onUpdate,
      rfqData.customerName,
      rfqData.customerEmail,
      rfqData.customerPhone,
      rfqData.description,
      rfqData.projectName,
      rfqData.projectType,
      rfqData.additionalContacts,
      customerAutoFilled.customerName,
      customerAutoFilled.customerEmail,
      customerAutoFilled.customerPhone,
      profile,
    ],
  );

  const applyProductSelectionsFromProfiles = useCallback(
    (profiles: NixRfqPipingProfileMetadata[]): string[] => {
      const detected = new Set<string>();
      for (const profile of profiles) {
        for (const bundle of profile.supplierBundles) {
          const productValue = BUNDLE_KEY_TO_PRODUCT[bundle.key];
          if (productValue) detected.add(productValue);
        }
      }
      if (detected.size === 0) return [];

      const rawRequiredProducts = rfqData.requiredProducts;
      const existing = rawRequiredProducts || [];
      const merged = new Set<string>(existing);
      const newlyAdded: string[] = [];
      detected.forEach((value) => {
        if (!merged.has(value)) {
          merged.add(value);
          newlyAdded.push(value);
        }
      });
      if (newlyAdded.length > 0) {
        onUpdate("requiredProducts", Array.from(merged));
      }
      return newlyAdded;
    },
    [onUpdate, rfqData.requiredProducts],
  );

  // Persist a non-extracted file to S3 immediately via Nix's archive-only
  // mode. Ensures supporting docs (the .eml itself, tender PDFs, images,
  // anything that's not the Excel BOQ) survive a tab close / session
  // expiry instead of being held in pendingDocuments memory until
  // submission.
  const archiveToS3 = useCallback(
    async (file: File, role: NixDocumentRole) => {
      try {
        await nixApi.uploadAndProcess(file, {
          skipExtraction: true,
          documentRole: role,
          rfqId: currentDraftId ?? undefined,
          sourceModule: "rfq",
        });
      } catch (err) {
        // Non-blocking: file stays in pendingDocuments and gets uploaded
        // again at RFQ submission. The customer doesn't see this failure.
        log.warn(`[RFQ] Failed to archive ${file.name} to S3 — will retry at submission`, err);
      }
    },
    [currentDraftId],
  );

  const onAddDocument = useCallback(
    async (incoming: File) => {
      const kind = classifyDroppedFile(incoming);

      if (kind !== "eml") {
        // Smart routing: tender-like PDFs/docs go into the tender list
        // (so they're submitted with role=specification); everything
        // else goes into the BOQ/drawings list. The classifier uses
        // filename heuristics for PDFs since we can't read content
        // here — customer can still re-categorise via the inline
        // "Move to..." menu in the unified list below.
        const tenderId = `tender-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`;
        const docId = `doc-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`;
        if (kind === "tender") {
          storeAddTenderDocument({ file: incoming, id: tenderId });
          archiveToS3(incoming, "specification");
        } else if (kind === "boq") {
          storeAddDocument({ file: incoming, id: docId });
          // BOQ extraction also mirrors the file to S3 — no need to
          // archive separately.
          await runNixBoqExtraction(incoming);
        } else {
          storeAddDocument({ file: incoming, id: docId });
          archiveToS3(incoming, "drawing");
        }
        return;
      }

      const parsed = await parseEmail(incoming).catch(() => null);
      if (!parsed) {
        await confirm({
          title: "Couldn't read this email",
          message: `${incoming.name} doesn't look like a valid .eml file. Save the email out of your client and try again, or drop the attachments individually.`,
          variant: "warning",
          confirmLabel: "Got it",
          hideCancel: true,
        });
        return;
      }

      const customerApplied = applyEmailMetadataToCustomerFields(parsed.metadata);

      const emlId = `eml-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`;
      storeAddDocument({ file: incoming, id: emlId });
      // Persist the .eml itself immediately — it's the source-of-truth.
      archiveToS3(incoming, "other");

      const routeAttachment = (attachment: EmailAttachment) => {
        const idPrefix = attachment.kind === "tender" ? "tender" : "doc";
        const id = `${idPrefix}-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`;
        if (attachment.kind === "tender") {
          storeAddTenderDocument({ file: attachment.file, id });
        } else {
          storeAddDocument({ file: attachment.file, id });
        }
        // Excel attachments are archived through runNixBoqExtraction.
        // Everything else gets archived here.
        if (!isExcelFile(attachment.file)) {
          const role: NixDocumentRole = attachment.kind === "tender" ? "specification" : "other";
          archiveToS3(attachment.file, role);
        }
      };
      parsed.attachments.forEach(routeAttachment);

      const xlsxAttachments = parsed.attachments.filter((att) => isExcelFile(att.file));
      type ExtractionResultBundle = {
        profiles: NixRfqPipingProfileMetadata[];
        items: NixExtractedItem[];
        metadatas: NixExtractionMetadata[];
      };
      const runAllExtractions = async (): Promise<ExtractionResultBundle> => {
        const profiles: NixRfqPipingProfileMetadata[] = [];
        const items: NixExtractedItem[] = [];
        const metadatas: NixExtractionMetadata[] = [];
        for (const attachment of xlsxAttachments) {
          const result = await runNixBoqExtraction(attachment.file);
          if (!result) continue;
          if (result.profile) profiles.push(result.profile);
          items.push(...result.items);
          if (result.metadata) metadatas.push(result.metadata);
        }
        return { profiles, items, metadatas };
      };

      let extractionBundle = await runAllExtractions();
      let profiles = extractionBundle.profiles;
      const newlySelectedProducts = applyProductSelectionsFromProfiles(profiles);

      const buildPopupMessage = (
        attemptProfiles: NixRfqPipingProfileMetadata[],
        isRetry: boolean,
      ): string[] => {
        const totalItems = attemptProfiles.reduce((sum, p) => {
          const supplyCount = p.supplyItemCount;
          return sum + (supplyCount ?? 0);
        }, 0);
        const totalBundles = new Set(
          attemptProfiles.flatMap((p) => p.supplierBundles.map((b) => b.key)),
        ).size;
        const totalDuplicates = attemptProfiles.reduce((sum, p) => {
          const dupes = p.duplicates;
          return sum + (dupes ? dupes.length : 0);
        }, 0);

        const lines: string[] = [];
        lines.push(
          `Saved ${parsed.attachments.length + 1} document${parsed.attachments.length === 0 ? "" : "s"} from ${incoming.name}:`,
        );
        lines.push("");
        lines.push("• Original email kept as source-of-truth");
        const boqCount = parsed.attachments.filter((a) => a.kind === "boq").length;
        const tenderCount = parsed.attachments.filter((a) => a.kind === "tender").length;
        const otherCount = parsed.attachments.length - boqCount - tenderCount;
        if (boqCount > 0)
          lines.push(`• ${boqCount} spreadsheet${boqCount === 1 ? "" : "s"} → BOQ bucket`);
        if (tenderCount > 0)
          lines.push(
            `• ${tenderCount} document${tenderCount === 1 ? "" : "s"} → Tender Specs bucket`,
          );
        if (otherCount > 0)
          lines.push(`• ${otherCount} other attachment${otherCount === 1 ? "" : "s"} → BOQ bucket`);

        if (xlsxAttachments.length > 0 && totalItems > 0) {
          lines.push("");
          lines.push(
            `Nix extracted ${totalItems} line item${totalItems === 1 ? "" : "s"} across ${totalBundles} supplier bundle${totalBundles === 1 ? "" : "s"}.`,
          );
          if (totalDuplicates > 0) {
            lines.push(
              `${totalDuplicates} duplicate group${totalDuplicates === 1 ? "" : "s"} flagged for review.`,
            );
          }
        }

        if (!isRetry) {
          const customerLines: string[] = [];
          if (customerApplied.name) customerLines.push("Customer Name");
          if (customerApplied.email) customerLines.push("Customer Email");
          if (customerApplied.phone) customerLines.push("Customer Phone");
          if (customerApplied.description) customerLines.push("RFQ Description");
          if (customerApplied.projectName) customerLines.push("Project Name");
          if (customerApplied.additionalContacts) customerLines.push("Additional Contacts (CC)");
          if (customerApplied.projectType) {
            const typeLabel = PROJECT_TYPES.find((t) => t.value === customerApplied.projectType);
            const labelText = typeLabel ? typeLabel.label : customerApplied.projectType;
            customerLines.push(`Project Type → ${labelText}`);
          }
          if (customerLines.length > 0) {
            lines.push("");
            lines.push(`Form fields auto-filled from sender: ${customerLines.join(", ")}.`);
          }

          const ccList = parsed.metadata.ccList;
          const signatureEmails = parsed.metadata.signatureEmails;
          const signaturePhones = parsed.metadata.signaturePhones;
          const additionalContactLines: string[] = [];
          if (ccList.length > 0) {
            additionalContactLines.push(`CC: ${ccList.join(", ")}`);
          }
          if (signatureEmails.length > 0) {
            additionalContactLines.push(`Other emails in signature: ${signatureEmails.join(", ")}`);
          }
          if (signaturePhones.length > 1) {
            const additionalPhones = signaturePhones.slice(1);
            additionalContactLines.push(
              `Additional phone${additionalPhones.length === 1 ? "" : "s"} in signature: ${additionalPhones.join(", ")}`,
            );
          }
          if (additionalContactLines.length > 0) {
            lines.push("");
            lines.push("Additional contacts captured (preserved on the .eml on S3):");
            additionalContactLines.forEach((line) => lines.push(`• ${line}`));
          }

          if (newlySelectedProducts.length > 0) {
            const productLabels = newlySelectedProducts.map((value) => {
              const product = PRODUCTS_AND_SERVICES.find((p) => p.value === value);
              return product ? product.label : value;
            });
            lines.push("");
            lines.push(`Required products auto-selected from BOQ: ${productLabels.join(", ")}.`);
          }
        } else {
          lines.push("");
          lines.push(
            "If this still isn't right, click Reject and we'll switch to Step 3 - Items where you can review and correct each line. Your edits are captured as feedback for Nix.",
          );
        }
        return lines;
      };

      // Push extracted items into the wizard's Step 3 items list AND build
      // the location-search haystack from email body + every BOQ's
      // projectLocation/projectName header (task A + C).
      const acceptExtraction = (bundle: ExtractionResultBundle) => {
        if (bundle.items.length > 0) {
          applyNixItemsToRfq(bundle.items);
        }
        // Mark the extraction as accepted so the orchestrator's Next/Previous
        // handlers skip Step 2 (Specifications) — extracted items already
        // carry their own specs.
        onUpdate("boqExtractionAccepted", true);
        const rawSubject = parsed.metadata.subject;
        const rawBody = parsed.metadata.bodyText;
        const subjectText = rawSubject || "";
        const bodyText = rawBody || "";
        const boqLocationHints = bundle.metadatas
          .flatMap((m) => [m.projectLocation, m.projectName])
          .filter((s): s is string => !!s)
          .join("\n");
        setEmailLocationSearchText(
          [subjectText, bodyText, boqLocationHints].filter(Boolean).join("\n"),
        );
      };

      // First attempt — full extraction summary with auto-fill detail.
      const acceptedFirst = await confirm({
        title: "Email processed",
        message: buildPopupMessage(profiles, false).join("\n"),
        variant: "info",
        confirmLabel: "Accept",
        cancelLabel: "Reject",
      });
      if (acceptedFirst) {
        acceptExtraction(extractionBundle);
        return;
      }

      // First reject — re-run Nix on every xlsx and let the customer compare.
      showToast("Re-running Nix extraction so it can take another pass…", "info");
      extractionBundle = await runAllExtractions();
      profiles = extractionBundle.profiles;
      applyProductSelectionsFromProfiles(profiles);

      const acceptedSecond = await confirm({
        title: "Email processed (re-extracted)",
        message: buildPopupMessage(profiles, true).join("\n"),
        variant: "info",
        confirmLabel: "Accept",
        cancelLabel: "Reject",
      });
      if (acceptedSecond) {
        acceptExtraction(extractionBundle);
        return;
      }

      // Second reject — load the items anyway (otherwise Step 3 is empty
      // and there's nothing for the customer to correct, contradicting the
      // popup's own promise). Then offer a choice: stay on Step 1 to
      // review the auto-filled customer/project fields first, or jump
      // straight to Step 3.
      acceptExtraction(extractionBundle);
      const goToItemsNow = await confirm({
        title: "We've loaded the items for you to review",
        message:
          "Nix didn't get this right twice — but we've loaded all extracted lines into Step 3 - Items so you can correct individual rows. Your edits there will be captured as feedback so Nix learns for next time.\n\nReview the auto-filled fields on this page first, or jump to the items list now?",
        variant: "warning",
        confirmLabel: "Go to Items now",
        cancelLabel: "Stay here and review",
      });
      if (goToItemsNow) {
        setWizardCurrentStep(3);
      }
    },
    [
      storeAddDocument,
      storeAddTenderDocument,
      confirm,
      showToast,
      applyEmailMetadataToCustomerFields,
      applyProductSelectionsFromProfiles,
      applyNixItemsToRfq,
      runNixBoqExtraction,
      setWizardCurrentStep,
      archiveToS3,
    ],
  );

  const [additionalNotes, setAdditionalNotes] = useState<string[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const hasProjectTypeError = Boolean(errors.projectType);

  const getMapConfig = () =>
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    typeof window !== "undefined" && window.innerWidth < 768 ? "responsive" : "default";

  // Document upload confirmation state
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [tenderDocumentsConfirmed, setTenderDocumentsConfirmed] = useState(false);
  const [showNoDocumentsPopup, setShowNoDocumentsPopup] = useState(false);

  // SA Mines state
  const [mines, setMines] = useState<SaMine[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<number | null>(null);
  const [isLoadingMines, setIsLoadingMines] = useState(false);
  const [mineDataLoading, setMineDataLoading] = useState(false);
  const [showAddMineModal, setShowAddMineModal] = useState(false);

  // Track which location fields were auto-filled from the map picker
  const [locationAutoFilled, setLocationAutoFilled] = useState<{
    latitude: boolean;
    longitude: boolean;
    siteAddress: boolean;
    region: boolean;
    country: boolean;
  }>({
    latitude: false,
    longitude: false,
    siteAddress: false,
    region: false,
    country: false,
  });

  // Section confirmation state - for locking data after user confirms
  const [projectTypeConfirmed, setProjectTypeConfirmed] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [environmentalConfirmed, setEnvironmentalConfirmed] = useState(false);

  // Edit mode state - for unlocking confirmed sections
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingEnvironmental, setIsEditingEnvironmental] = useState(false);

  // Environmental intelligence auto-fill
  const {
    isLoading: isLoadingEnvironmental,
    errors: environmentalErrors,
    autoFilledFields,
    metadata: environmentalMetadata,
    fetchAndApply: fetchEnvironmentalData,
    wasAutoFilled,
    markAsOverridden,
    markFieldsAsAutoFilled,
  } = useEnvironmentalIntelligence();

  const handleLocationSelect = async (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string },
  ) => {
    // Update location fields and mark as auto-filled
    onUpdate("latitude", location.lat);
    onUpdate("longitude", location.lng);

    // Track which fields are being auto-filled
    const newAutoFilled = {
      latitude: true,
      longitude: true,
      siteAddress: false,
      region: false,
      country: false,
    };

    if (addressComponents) {
      if (addressComponents.address) {
        onUpdate("siteAddress", addressComponents.address);
        newAutoFilled.siteAddress = true;
      }
      if (addressComponents.region) {
        onUpdate("region", addressComponents.region);
        newAutoFilled.region = true;
      }
      if (addressComponents.country) {
        onUpdate("country", addressComponents.country);
        newAutoFilled.country = true;
      }
    }

    setLocationAutoFilled(newAutoFilled);
    setShowMapPicker(false);

    // Fetch environmental data and auto-fill fields
    if (onUpdateGlobalSpecs) {
      try {
        log.debug("[Form] Fetching environmental data for:", location);
        const environmentalData = await fetchEnvironmentalData(
          location.lat,
          location.lng,
          addressComponents?.region,
          addressComponents?.country,
        );

        log.debug("[Form] Environmental data received:", environmentalData);
        log.debug("[Form] Current globalSpecs:", globalSpecs);

        // Update globalSpecs with environmental data
        const updatedSpecs = {
          ...globalSpecs,
          ...environmentalData,
        };
        log.debug("[Form] Updated globalSpecs:", updatedSpecs);
        onUpdateGlobalSpecs(updatedSpecs);
      } catch (error) {
        // Silently handle - user can still fill in manually
        if (error instanceof Error && error.message !== "Backend unavailable") {
          log.error("Failed to fetch environmental data:", error);
        }
      }
    }
  };

  const commonNotes = [
    "All pipes to be hydrostatically tested before delivery",
    "Material certificates required (EN 10204 3.1)",
    "Pipes to be supplied with protective end caps",
    "Delivery required to site in South Africa",
    "All flanges to be raised face (RF) unless specified",
    "Pipes to comply with SABS/SANS standards",
    "Mill test certificates required for all items",
    "Surface preparation: Shot blast to SA2.5 standard",
    "Urgent delivery required - please expedite",
    "Client inspection required before dispatch",
  ];

  // Handle mine selection
  const handleMineSelect = async (mineId: number | null) => {
    setSelectedMineId(mineId);

    if (!mineId) {
      return;
    }

    setMineDataLoading(true);
    try {
      // Fetch mine with environmental data (includes slurry profile and lining recommendation)
      const mineData = await minesApi.getMineWithEnvironmentalData(mineId);
      const { mine, slurryProfile, liningRecommendation } = mineData;

      // Auto-fill location fields
      if (mine.latitude && mine.longitude) {
        onUpdate("latitude", mine.latitude);
        onUpdate("longitude", mine.longitude);
      }
      if (mine.physicalAddress) {
        onUpdate("siteAddress", mine.physicalAddress);
      }
      if (mine.province) {
        onUpdate("region", mine.province);
      }
      onUpdate("country", "South Africa");

      // Mark location fields as auto-filled
      setLocationAutoFilled({
        latitude: !!mine.latitude,
        longitude: !!mine.longitude,
        siteAddress: !!mine.physicalAddress,
        region: !!mine.province,
        country: true,
      });

      // Auto-fill environmental intelligence from slurry profile
      if (slurryProfile && onUpdateGlobalSpecs) {
        const updatedSpecs = {
          ...globalSpecs,
          // Slurry characteristics from commodity profile
          mineSelected: mine.mineName,
          mineCommodity: slurryProfile.commodityName,
          slurryPHMin: slurryProfile.phMin,
          slurryPHMax: slurryProfile.phMax,
          slurrySGMin: slurryProfile.typicalSgMin,
          slurrySGMax: slurryProfile.typicalSgMax,
          slurrySolidsMin: slurryProfile.solidsConcentrationMin,
          slurrySolidsMax: slurryProfile.solidsConcentrationMax,
          slurryTempMin: slurryProfile.tempMin,
          slurryTempMax: slurryProfile.tempMax,
          abrasionRisk: slurryProfile.abrasionRisk,
          corrosionRisk: slurryProfile.corrosionRisk,
          primaryFailureMode: slurryProfile.primaryFailureMode,
        };

        // Add lining recommendation if available
        if (liningRecommendation) {
          updatedSpecs.recommendedLining = liningRecommendation.recommendedLining;
          updatedSpecs.recommendedCoating = liningRecommendation.recommendedCoating;
          updatedSpecs.liningApplicationNotes = liningRecommendation.applicationNotes;
        }

        // Also fetch environmental/weather data based on mine location
        if (mine.latitude && mine.longitude) {
          try {
            log.debug("[Mine Selection] Fetching environmental data for:", mine.mineName);
            const environmentalData = await fetchEnvironmentalData(
              mine.latitude,
              mine.longitude,
              mine.province,
              "South Africa",
            );
            log.debug("[Mine Selection] Environmental data received:", environmentalData);

            // Merge environmental data with slurry profile data
            Object.assign(updatedSpecs, environmentalData);
          } catch (error) {
            // Silently handle - user can still fill in manually
            if (error instanceof Error && error.message !== "Backend unavailable") {
              log.error("[Mine Selection] Failed to fetch environmental data:", error);
            }
          }
        }

        onUpdateGlobalSpecs(updatedSpecs);
      } else if (mine.latitude && mine.longitude && onUpdateGlobalSpecs) {
        // Even without slurry profile, fetch environmental data if we have coordinates
        try {
          log.debug(
            "[Mine Selection] Fetching environmental data (no slurry profile):",
            mine.mineName,
          );
          const environmentalData = await fetchEnvironmentalData(
            mine.latitude,
            mine.longitude,
            mine.province,
            "South Africa",
          );
          log.debug("[Mine Selection] Environmental data received:", environmentalData);
          onUpdateGlobalSpecs({
            ...globalSpecs,
            mineSelected: mine.mineName,
            ...environmentalData,
          });
        } catch (error) {
          // Silently handle - user can still fill in manually
          if (error instanceof Error && error.message !== "Backend unavailable") {
            log.error("[Mine Selection] Failed to fetch environmental data:", error);
          }
        }
      }

      log.debug("[Mine Selection] Auto-filled from mine:", mine.mineName);
    } catch (error) {
      // When backend is unavailable, use fallback mine data from local list
      const fallbackMine = fallbackMines.find((m) => m.id === mineId);
      if (fallbackMine) {
        log.debug("[Mine Selection] Using fallback data for:", fallbackMine.mineName);

        // Auto-fill location fields from fallback data
        if (fallbackMine.latitude && fallbackMine.longitude) {
          onUpdate("latitude", fallbackMine.latitude);
          onUpdate("longitude", fallbackMine.longitude);
        }
        if (fallbackMine.physicalAddress) {
          onUpdate("siteAddress", fallbackMine.physicalAddress);
        }
        if (fallbackMine.province) {
          onUpdate("region", fallbackMine.province);
        }
        onUpdate("country", "South Africa");

        // Mark location fields as auto-filled
        setLocationAutoFilled({
          latitude: !!fallbackMine.latitude,
          longitude: !!fallbackMine.longitude,
          siteAddress: !!fallbackMine.physicalAddress,
          region: !!fallbackMine.province,
          country: true,
        });

        if (onUpdateGlobalSpecs) {
          const updatedSpecs = buildFallbackEnvironmentalSpecs(fallbackMine, globalSpecs);
          onUpdateGlobalSpecs(updatedSpecs);
          markFieldsAsAutoFilled([...FALLBACK_ENVIRONMENTAL_AUTO_FILLED_FIELDS]);
          log.debug("[Mine Selection] Auto-filled with fallback data for:", fallbackMine.mineName);
        }
      } else if (error instanceof Error && error.message !== "Backend unavailable") {
        log.error("Failed to fetch mine environmental data:", error);
      }
    } finally {
      setMineDataLoading(false);
    }
  };

  // After an .eml drop, search the email's subject + body for any SaMine
  // name. If exactly one mine matches, auto-select it (re-using the same
  // handleMineSelect path that fills lat/lng/region/etc.). If no match —
  // and no location field has been touched yet — open the
  // LocationRequiredModal as a forcing prompt.
  useEffect(() => {
    if (!emailLocationSearchText) return;
    if (mines.length === 0) return;

    const haystack = emailLocationSearchText.toLowerCase();
    const matches = mines.filter((mine) => {
      const name = mine.mineName.toLowerCase();
      if (name.length < 4) return false;
      return haystack.includes(name);
    });

    const rawLatitude = rfqData.latitude;
    const rawLongitude = rfqData.longitude;
    const rawSiteAddress = rfqData.siteAddress;
    const hasLocation = rawLatitude || rawLongitude || rawSiteAddress;

    if (matches.length === 1 && !hasLocation && !selectedMineId) {
      handleMineSelect(matches[0].id);
    } else if (matches.length === 0 && !hasLocation && !selectedMineId) {
      setShowLocationRequiredModal(true);
    }

    setEmailLocationSearchText(null);
  }, [
    emailLocationSearchText,
    mines,
    rfqData.latitude,
    rfqData.longitude,
    rfqData.siteAddress,
    selectedMineId,
  ]);

  // Handle new mine created from modal
  const handleMineCreated = (newMine: SaMine) => {
    // Add the new mine to the list
    setMines((prevMines) =>
      [...prevMines, newMine].sort((a, b) => a.mineName.localeCompare(b.mineName)),
    );
    // Select the newly created mine
    handleMineSelect(newMine.id);
    // Close the modal
    setShowAddMineModal(false);
  };

  // Handle mine dropdown change
  const handleMineDropdownChange = (value: string) => {
    if (value === "add-new") {
      setShowAddMineModal(true);
    } else {
      handleMineSelect(value ? Number(value) : null);
    }
  };

  useEffect(() => {
    const loadMines = async () => {
      setIsLoadingMines(true);
      try {
        const activeMines = await minesApi.getActiveMines();
        setMines(activeMines);
      } catch (error) {
        if (error instanceof Error && error.message !== "Backend unavailable") {
          log.error("Failed to fetch mines:", error);
        }
        setMines(fallbackMines);
      } finally {
        setIsLoadingMines(false);
      }
    };
    loadMines();
  }, []);

  // Auto-generate RFQ reference number + project-name fallback when fields
  // are empty (but not when loading a draft; the draft restore provides
  // both). The customer-facing RFQ Reference is the system reference; the
  // Project Name is overwritten by the email subject in
  // applyEmailMetadataToCustomerFields if a .eml is dropped — until then
  // it shares the system reference as a placeholder so the field is never
  // visibly blank.
  useEffect(() => {
    // Skip auto-generation if we're loading a draft - the draft will provide the data
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("draft") || urlParams.get("draftId") || urlParams.get("recover")) return;

    const rawProjectName = rfqData.projectName;
    const rawRfqRef = rfqData.customerRfqReference;
    const projectNameEmpty = !rawProjectName || rawProjectName.trim() === "";
    const rfqRefEmpty = !rawRfqRef || rawRfqRef.trim() === "";
    if (!projectNameEmpty && !rfqRefEmpty) return;

    const autoGenNumber = generateSystemReferenceNumber();
    if (rfqRefEmpty) onUpdate("customerRfqReference", autoGenNumber);
    if (projectNameEmpty) onUpdate("projectName", autoGenNumber);
  }, []);

  const addNote = (note: string) => {
    if (note && !additionalNotes.includes(note)) {
      const newNotes = [...additionalNotes, note];
      setAdditionalNotes(newNotes);
      const rawNotes = rfqData.notes;
      const currentNotes = rawNotes || "";
      const updatedNotes = currentNotes ? `${currentNotes}\n• ${note}` : `• ${note}`;
      onUpdate("notes", updatedNotes);
    }
  };

  const removeNote = (noteToRemove: string) => {
    const newNotes = additionalNotes.filter((note) => note !== noteToRemove);
    setAdditionalNotes(newNotes);
    const updatedNotes = newNotes.length > 0 ? newNotes.map((note) => `• ${note}`).join("\n") : "";
    onUpdate("notes", updatedNotes);
  };

  // Helper to update environmental fields in globalSpecs (not rfqData)
  // This ensures they get saved properly since save function saves globalSpecs
  const updateEnvironmentalField = useCallback(
    (field: string, value: any) => {
      log.debug(`🌍 Environmental field updated: ${field} =`, value);
      if (onUpdateGlobalSpecs) {
        onUpdateGlobalSpecs({
          ...globalSpecs,
          [field]: value,
        });
      }
    },
    [globalSpecs, onUpdateGlobalSpecs],
  );

  // Validation helper functions
  const hasRequiredLocationData = () => {
    return !!(
      rfqData.latitude &&
      rfqData.longitude &&
      rfqData.siteAddress &&
      rfqData.region &&
      rfqData.country
    );
  };

  const hasRequiredEnvironmentalData = () => {
    const rawSoilTexture = globalSpecs?.soilTexture;
    const rawSoilMoistureClass = globalSpecs?.soilMoistureClass;
    const rawSoilDrainage = globalSpecs?.soilDrainage;
    // Soil Conditions - visible fields required
    const hasSoilData = !!(
      (rawSoilTexture || rfqData.soilTexture) &&
      (rawSoilMoistureClass || rfqData.soilMoistureClass) &&
      (rawSoilDrainage || rfqData.soilDrainage)
    );

    const rawAnnualRainfall = globalSpecs?.annualRainfall;

    // Atmospheric Conditions - only visible fields required
    const hasAtmosphericData = !!(
      (globalSpecs?.tempMin !== undefined || rfqData.tempMin !== undefined) &&
      (globalSpecs?.tempMax !== undefined || rfqData.tempMax !== undefined) &&
      globalSpecs?.humidityMean !== undefined &&
      (rawAnnualRainfall || rfqData.rainfall)
    );

    const rawDetailedMarineInfluence = globalSpecs?.detailedMarineInfluence;
    const rawFloodRisk = globalSpecs?.floodRisk;
    const rawEcpIndustrialPollution = globalSpecs?.ecpIndustrialPollution;

    // Marine & Special Conditions - visible dropdown fields required
    const hasMarineData = !!(
      (rawDetailedMarineInfluence || rfqData.marineInfluence) &&
      (rawFloodRisk || rfqData.floodingRisk) &&
      (rawEcpIndustrialPollution || rfqData.industrialPollution)
    );

    return hasSoilData && hasAtmosphericData && hasMarineData;
  };

  // Handlers for confirmation/edit
  const handleConfirmLocation = () => {
    if (hasRequiredLocationData()) {
      setLocationConfirmed(true);
      setIsEditingLocation(false);
    }
  };

  const handleConfirmEnvironmental = () => {
    if (hasRequiredEnvironmentalData()) {
      setEnvironmentalConfirmed(true);
      setIsEditingEnvironmental(false);
    }
  };

  const handleEditLocation = () => {
    setIsEditingLocation(true);
  };

  const handleEditEnvironmental = () => {
    setIsEditingEnvironmental(true);
  };

  // (auth hooks hoisted to top — see early useOptionalCustomerAuth call)

  // Unregistered customer restrictions - when not authenticated as customer or admin, limit available options
  // Don't apply restrictions while auth is still loading to prevent flash of restricted state
  const restrictUnregistered = !featureFlags || featureFlags["RFQ_RESTRICT_UNREGISTERED"] !== false;
  const isAuthLoading = isCustomerAuthLoading || isAdminAuthLoading;
  const isUnregisteredCustomer =
    !isAuthLoading && restrictUnregistered && !isCustomerAuthenticated && !isAdminAuthenticated;

  // Restriction popup state for unregistered customers
  const [restrictionPopup, setRestrictionPopup] = useState<RestrictionPopupPosition | null>(null);

  const showRestrictionTooltip = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRestrictionPopup({ x: e.clientX, y: e.clientY });
  }, []);

  const hideRestrictionTooltip = useCallback(() => {
    setRestrictionPopup(null);
  }, []);

  // Auto-fill customer fields when logged in (but not when loading a draft)
  useEffect(() => {
    // Skip auto-fill if we're loading a draft - the draft will provide customer info
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("draft") || urlParams.get("draftId")) return;

    if (isCustomerAuthenticated && profile) {
      const updates: { customerName?: boolean; customerEmail?: boolean; customerPhone?: boolean } =
        {};

      const rawFirstName = profile.firstName;

      // Auto-fill customer name if empty
      if (!rfqData.customerName && (rawFirstName || profile.lastName)) {
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
        onUpdate("customerName", fullName);
        updates.customerName = true;
      }

      // Auto-fill customer email if empty
      if (!rfqData.customerEmail && profile.email) {
        onUpdate("customerEmail", profile.email);
        updates.customerEmail = true;
      }

      const rawMobilePhone = profile.mobilePhone;

      // Auto-fill customer phone if empty (try mobilePhone, directPhone, or company primaryPhone)
      const phoneNumber = rawMobilePhone || profile.directPhone || profile.company?.primaryPhone;
      if (!rfqData.customerPhone && phoneNumber) {
        onUpdate("customerPhone", phoneNumber);
        updates.customerPhone = true;
      }

      if (keys(updates).length > 0) {
        setCustomerAutoFilled((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [
    isCustomerAuthenticated,
    profile,
    rfqData.customerName,
    rfqData.customerEmail,
    rfqData.customerPhone,
    onUpdate,
  ]);

  // Derived state for locked sections
  const isLocationLocked = locationConfirmed && !isEditingLocation;
  const isEnvironmentalLocked = environmentalConfirmed && !isEditingEnvironmental;

  const rawCustomerRfqReference = rfqData.customerRfqReference;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Project/RFQ Details</h2>
      {/* Nix AI Assistant Active Banner */}
      {useNix && (
        <div className="mb-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nix AI Assistant is Active</p>
                <p className="text-xs text-gray-600">
                  Nix will analyze your documents to auto-populate the RFQ form
                </p>
              </div>
            </div>
            {nixStopUsing && (
              <button
                type="button"
                onClick={nixStopUsing}
                className="text-sm text-orange-700 hover:text-orange-900 underline font-medium"
              >
                Stop using Nix
              </button>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {/* Customer Information - Required fields */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Customer Information
            {isCustomerAuthenticated && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Logged in
              </span>
            )}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div data-field="customerName" data-nix-target="customerName">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerName}
                onChange={(val) => onUpdate("customerName", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerName: false }))
                }
                isAutoFilled={customerAutoFilled.customerName}
                placeholder="Customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div data-field="customerEmail" data-nix-target="customerEmail">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Email <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerEmail}
                onChange={(val) => onUpdate("customerEmail", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerEmail: false }))
                }
                isAutoFilled={customerAutoFilled.customerEmail}
                placeholder="email@example.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>
              )}
            </div>

            <div data-field="customerPhone" data-nix-target="customerPhone">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Phone <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerPhone}
                onChange={(val) => onUpdate("customerPhone", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerPhone: false }))
                }
                isAutoFilled={customerAutoFilled.customerPhone}
                placeholder="+27 11 000 0123"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>
              )}
            </div>

            <div data-field="requiredDate" data-nix-target="requiredDate">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Required Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={rfqData.requiredDate}
                onChange={(e) => onUpdate("requiredDate", e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                required
              />
              {errors.requiredDate && (
                <p className="mt-1 text-xs text-red-600">{errors.requiredDate}</p>
              )}
            </div>
          </div>

          {(() => {
            const rawAdditionalContacts = rfqData.additionalContacts;
            const additionalContactsValue = rawAdditionalContacts || "";
            return (
              <div className="mt-2" data-field="additionalContacts">
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Additional Contacts (CC)
                  <span className="ml-1 font-normal text-gray-500">
                    — comma-separated emails of anyone who should be copied on follow-ups
                  </span>
                </label>
                <input
                  type="text"
                  value={additionalContactsValue}
                  onChange={(e) => onUpdate("additionalContacts", e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  placeholder="e.g., attie@example.com, ops@example.com"
                />
              </div>
            );
          })()}
        </div>

        {/* Drop email/BOQ first — Nix auto-fills the rest of the form. Only when the Nix tender flow is NOT enabled via project type. */}
        {!useNix && (
          <div className="mt-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 mb-3 px-1 leading-relaxed">
              <span className="font-semibold">Save time:</span> drag your customer's email (.eml) or
              BOQ spreadsheet here first. Nix extracts every attachment and auto-fills Customer
              Name, Email, Phone, and RFQ Description from the email sender — you'll only need to
              confirm the rest.
            </p>
            <div>
              {isUnregisteredCustomer ? (
                <div
                  onMouseEnter={showRestrictionTooltip}
                  onMouseLeave={hideRestrictionTooltip}
                  className="bg-gray-100 rounded-lg p-3 border border-gray-300 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-gray-400 rounded">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-500">RFQ Documents</h3>
                      <p className="text-xs text-gray-400">Email, BOQ, drawings and tender specs</p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">
                        Registered Users Only
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-200 rounded-lg p-4 border-2 border-dashed border-gray-300">
                    <div className="text-center text-gray-400">
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-xs">Document upload available for registered users</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <UnifiedRfqDocumentBucket
                    pendingDocuments={pendingDocuments || []}
                    pendingTenderDocuments={pendingTenderDocuments || []}
                    onAddDocument={onAddDocument}
                    onRemoveDocument={onRemoveDocument}
                    onRemoveTenderDocument={onRemoveTenderDocument}
                    onMoveDocumentToTender={(id) => {
                      const doc = pendingDocuments.find((d) => d.id === id);
                      if (!doc) return;
                      onRemoveDocument(id);
                      storeAddTenderDocument(doc);
                    }}
                    onMoveTenderDocumentToBoq={(id) => {
                      const doc = pendingTenderDocuments.find((d) => d.id === id);
                      if (!doc) return;
                      onRemoveTenderDocument(id);
                      storeAddDocument(doc);
                    }}
                    isConfirmed={documentsConfirmed && tenderDocumentsConfirmed}
                    onConfirm={() => {
                      setDocumentsConfirmed(true);
                      setTenderDocumentsConfirmed(true);
                      // The unified Confirm is the explicit "yes, these
                      // are the right documents — proceed" commit. Mark
                      // the BOQ extraction as accepted so the
                      // orchestrator's Next handler skips Step 2
                      // (Specifications). Either this OR the
                      // Email-processed popup's Accept arm the same
                      // flag.
                      onUpdate("boqExtractionAccepted", true);
                    }}
                    onUnconfirm={() => {
                      setDocumentsConfirmed(false);
                      setTenderDocumentsConfirmed(false);
                      // Reverting Confirm should also revert the Step-2
                      // skip — the customer is signalling they want to
                      // re-review or change documents.
                      onUpdate("boqExtractionAccepted", false);
                    }}
                    onConfirmEmpty={() => setShowNoDocumentsPopup(true)}
                  />
                  {boqExtractionSummary && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900">
                            Nix extracted {boqExtractionSummary.itemCount} line item
                            {boqExtractionSummary.itemCount === 1 ? "" : "s"} from{" "}
                            {boqExtractionSummary.fileName}
                          </p>
                          <p className="text-blue-800 mt-0.5">
                            Split into {boqExtractionSummary.bundleCount} supplier bundle
                            {boqExtractionSummary.bundleCount === 1 ? "" : "s"}
                            {boqExtractionSummary.duplicateCount > 0
                              ? `; ${boqExtractionSummary.duplicateCount} duplicate group${boqExtractionSummary.duplicateCount === 1 ? "" : "s"} flagged for review`
                              : ""}
                            {boqExtractionSummary.drawingRefCount > 0
                              ? `; ${boqExtractionSummary.drawingRefCount} drawing reference${boqExtractionSummary.drawingRefCount === 1 ? "" : "s"} captured`
                              : ""}
                            .
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Your RFQ Reference, Project Name, and Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div data-field="customerRfqReference">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Your RFQ Reference <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={rawCustomerRfqReference || ""}
              onChange={(e) => onUpdate("customerRfqReference", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="e.g., RFQ-2025-001"
            />
            {errors.customerRfqReference && (
              <p className="mt-1 text-xs text-red-600">{errors.customerRfqReference}</p>
            )}
          </div>
          <div data-field="projectName" data-nix-target="projectName">
            <label className="block text-xs font-semibold text-gray-900 mb-1">Project Name</label>
            <input
              type="text"
              value={rfqData.projectName}
              onChange={(e) => onUpdate("projectName", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Optional project name"
            />
          </div>
          <div data-field="description" data-nix-target="description">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              RFQ Description
            </label>
            <input
              type="text"
              value={rfqData.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Brief description of requirements"
            />
          </div>
        </div>

        {/* Project Type Selection - Compact */}
        <div
          data-field="projectType"
          data-nix-target="projectType"
          className={projectTypeConfirmed ? "opacity-75" : ""}
        >
          <label
            className={`block text-xs font-semibold mb-1 ${hasProjectTypeError ? "text-red-700" : "text-gray-900"}`}
          >
            Project Type <span className="text-red-600">*</span>
            {projectTypeConfirmed && (
              <span className="ml-2 text-green-600 text-xs font-normal">(Locked)</span>
            )}
          </label>
          <div
            className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? "pointer-events-none" : ""}`}
          >
            {PROJECT_TYPES.filter(
              (type) => !featureFlags || featureFlags[type.flagKey] !== false,
            ).map((type) => {
              const isDisabledForUnregistered =
                isUnregisteredCustomer && !isProjectTypeAvailableForUnregistered(type.value);
              const isDisabled = projectTypeConfirmed || isDisabledForUnregistered;

              return (
                <label
                  key={type.value}
                  title={
                    isDisabledForUnregistered
                      ? "Register or login to access this option"
                      : undefined
                  }
                  onMouseEnter={isDisabledForUnregistered ? showRestrictionTooltip : undefined}
                  onMouseLeave={isDisabledForUnregistered ? hideRestrictionTooltip : undefined}
                  className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-colors text-sm h-10 ${
                    isDisabledForUnregistered
                      ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                      : rfqData.projectType === type.value
                        ? "border-blue-600 bg-blue-50 cursor-pointer"
                        : hasProjectTypeError
                          ? "border-red-400 hover:border-red-500 cursor-pointer"
                          : "border-gray-200 hover:border-blue-300 cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={type.value}
                    checked={rfqData.projectType === type.value}
                    onChange={(e) => {
                      if (isDisabledForUnregistered) return;
                      const selectedType = e.target.value;
                      log.debug("🔘 Project type selected:", selectedType);
                      onUpdate("projectType", selectedType);

                      const nixProjectTypes = ["phase1", "retender", "feasibility"];
                      if (nixProjectTypes.includes(selectedType)) {
                        log.debug("🤖 Enabling Nix for tender project type");
                        onUpdate("useNix", true);
                      } else if (useNix && nixStopUsing) {
                        log.debug("🤖 Disabling Nix - switched to non-Nix project type");
                        nixStopUsing();
                      }
                    }}
                    className="sr-only"
                    disabled={isDisabled}
                  />
                  <div
                    className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                      isDisabledForUnregistered
                        ? "border-gray-300 bg-gray-200"
                        : rfqData.projectType === type.value
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300"
                    }`}
                  >
                    {rfqData.projectType === type.value && !isDisabledForUnregistered && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span
                    className={`font-medium ${isDisabledForUnregistered ? "text-gray-400" : "text-gray-900"}`}
                  >
                    {type.label}
                  </span>
                  {isDisabledForUnregistered && (
                    <svg
                      className="w-3 h-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
          {errors.projectType && <p className="mt-1 text-xs text-red-600">{errors.projectType}</p>}
        </div>

        {/* Required Products/Services Selection - Hidden when using Nix */}
        {!useNix && (
          <div
            data-field="requiredProducts"
            data-nix-target="requiredProducts"
            className={projectTypeConfirmed ? "opacity-75" : ""}
          >
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Required Products & Services <span className="text-red-600">*</span>
              {projectTypeConfirmed && (
                <span className="ml-2 text-green-600 text-xs font-normal">(Locked)</span>
              )}
            </label>
            <div
              className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? "pointer-events-none" : ""}`}
            >
              {PRODUCTS_AND_SERVICES.filter(
                (product) => !featureFlags || featureFlags[product.flagKey] !== false,
              ).map((product) => {
                const isSelected = rfqData.requiredProducts?.includes(product.value);
                const isDisabledForUnregistered =
                  isUnregisteredCustomer && !isProductAvailableForUnregistered(product.value);
                const isComingSoon = isProductComingSoon(product.value);
                const isDisabled =
                  projectTypeConfirmed || isDisabledForUnregistered || isComingSoon;

                return (
                  <label
                    key={product.value}
                    title={
                      isComingSoon
                        ? "Coming soon - this product/service is not yet available"
                        : isDisabledForUnregistered
                          ? "Register or login to access this product/service"
                          : product.description
                    }
                    onMouseEnter={
                      isDisabledForUnregistered && !isComingSoon
                        ? showRestrictionTooltip
                        : undefined
                    }
                    onMouseLeave={
                      isDisabledForUnregistered && !isComingSoon
                        ? hideRestrictionTooltip
                        : undefined
                    }
                    className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-all text-xs h-10 ${
                      isComingSoon
                        ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                        : isDisabledForUnregistered
                          ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                          : isSelected
                            ? "border-blue-600 bg-blue-50 cursor-pointer"
                            : "border-gray-200 hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected && !isDisabledForUnregistered && !isComingSoon}
                      onChange={(e) => {
                        if (isDisabledForUnregistered || isComingSoon) return;
                        const rawRequiredProducts = rfqData.requiredProducts;
                        const currentProducts = rawRequiredProducts || [];
                        let newProducts: string[];
                        if (e.target.checked) {
                          newProducts = [...currentProducts, product.value];
                        } else {
                          newProducts = currentProducts.filter((p: string) => p !== product.value);
                        }
                        log.debug("☑️ Required products updated:", newProducts);
                        onUpdate("requiredProducts", newProducts);
                      }}
                      className="sr-only"
                      disabled={isDisabled}
                    />
                    <div
                      className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                        isComingSoon || isDisabledForUnregistered
                          ? "border-gray-300 bg-gray-200"
                          : isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                      }`}
                    >
                      {isSelected && !isDisabledForUnregistered && !isComingSoon && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className={isComingSoon || isDisabledForUnregistered ? "grayscale" : ""}>
                      {product.icon}
                    </span>
                    <span
                      className={`font-medium ${isComingSoon || isDisabledForUnregistered ? "text-gray-400" : "text-gray-900"}`}
                    >
                      {product.label}
                    </span>
                    {isComingSoon && (
                      <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0 italic">
                        Soon
                      </span>
                    )}
                    {isDisabledForUnregistered && !isComingSoon && (
                      <svg
                        className="w-3 h-3 text-gray-400 ml-auto flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
            {errors.requiredProducts && (
              <p className="mt-1 text-xs text-red-600">{errors.requiredProducts}</p>
            )}
          </div>
        )}

        {/* Project Type & Products Confirmation Button - Hidden when using Nix */}
        {!useNix && (
          <div className="flex justify-end">
            {!projectTypeConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  if (!rfqData.projectType) {
                    onSetValidationError(
                      "projectType",
                      "Please select a Project Type before confirming.",
                    );
                    return;
                  }
                  if (!rfqData.requiredProducts || rfqData.requiredProducts.length === 0) {
                    onSetValidationError(
                      "requiredProducts",
                      "Please select at least one Required Product/Service before confirming.",
                    );
                    return;
                  }
                  onSetValidationError("projectType", null);
                  onSetValidationError("requiredProducts", null);
                  log.debug("✅ Project type & products confirmed:", {
                    projectType: rfqData.projectType,
                    requiredProducts: rfqData.requiredProducts,
                  });
                  setProjectTypeConfirmed(true);
                }}
                disabled={
                  !rfqData.projectType ||
                  !rfqData.requiredProducts ||
                  rfqData.requiredProducts.length === 0
                }
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
              >
                ✓ Confirm Project Type & Products
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Project Type & Products Confirmed
                </span>
                <button
                  type="button"
                  onClick={() => setProjectTypeConfirmed(false)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">Quick Notes</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addNote(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
            >
              <option value="">Add common note...</option>
              {commonNotes.map((note, index) => (
                <option key={index} value={note} disabled={additionalNotes.includes(note)}>
                  {note}
                </option>
              ))}
            </select>
            {additionalNotes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {additionalNotes.map((note, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs"
                  >
                    {note.substring(0, 20)}...
                    <button
                      type="button"
                      onClick={() => removeNote(note)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div data-nix-target="notes">
            <label className="block text-xs font-semibold text-gray-900 mb-1">Custom Notes</label>
            <textarea
              value={rfqData.notes}
              onChange={(e) => onUpdate("notes", e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Additional requirements..."
            />
          </div>
        </div>

        {/* Document Upload - Moved above Project Location when Nix is enabled */}
        {useNix && (
          <DocumentBucket
            id="rfq-nix-documents"
            title="Upload Documents for Nix"
            subtitle="Tender documents and drawings for AI analysis"
            tone="purple"
            documents={pendingDocuments || []}
            onAddDocument={onAddDocument}
            onRemoveDocument={onRemoveDocument}
            isConfirmed={documentsConfirmed}
            onConfirm={() => {
              setDocumentsConfirmed(true);
              nixProcessDocuments(showToast);
            }}
            onUnconfirm={() => setDocumentsConfirmed(false)}
            onConfirmEmpty={() => setShowNoDocumentsPopup(true)}
            isProcessing={isNixProcessing}
            processingLabel="Nix is reading..."
            confirmLabel="Confirm & Let Nix Read"
          />
        )}

        {/* Project Location - Compact */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Project Location
            </h4>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              disabled={isLocationLocked}
              className={`flex items-center gap-2 px-4 py-2 text-white transition-colors text-sm font-medium shadow-sm rounded-lg ${
                isLocationLocked
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Pick on Map
            </button>
          </div>

          {/* SA Mines Dropdown - Compact */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Quick Select: SA Mine (auto-fills location & slurry)
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedMineId || ""}
                onChange={(e) => handleMineDropdownChange(e.target.value)}
                disabled={isLoadingMines || mineDataLoading || isLocationLocked}
                style={{ colorScheme: "light", color: "#000000", backgroundColor: "#fef3c7" }}
                className="w-full px-2 py-1.5 border border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="" style={{ color: "#000000", backgroundColor: "#fef3c7" }}>
                  -- Select a mine (optional) --
                </option>
                <option
                  value="add-new"
                  style={{ color: "#b45309", backgroundColor: "#fef3c7" }}
                  className="font-medium"
                >
                  + Add a mine not listed
                </option>
                {mines.map((mine) => {
                  const rawCommodityName = mine.commodityName;

                  return (
                    <option
                      key={mine.id}
                      value={mine.id}
                      style={{ color: "#000000", backgroundColor: "#fef3c7" }}
                    >
                      {mine.mineName}- {mine.operatingCompany}({rawCommodityName || "Unknown"}) -{" "}
                      {mine.province}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {isLoadingMines || mineDataLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
            </div>
            {selectedMineId && (
              <div className="mt-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Location & slurry auto-filled
                <p className="text-xs text-amber-700 mt-1 ml-6">
                  Environmental intelligence will be populated based on commodity type
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Latitude</label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.latitude}
                onChange={(val) => onUpdate("latitude", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, latitude: false }))}
                isAutoFilled={locationAutoFilled.latitude}
                placeholder="-26.20227 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
              {!locationAutoFilled.latitude && (
                <p className="mt-1 text-xs text-gray-500">
                  Precision required for environmental analysis
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Longitude</label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.longitude}
                onChange={(val) => onUpdate("longitude", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, longitude: false }))}
                isAutoFilled={locationAutoFilled.longitude}
                placeholder="28.04363 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          <div className="mb-4" data-nix-target="siteAddress">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Site Address / Location Description
            </label>
            <AutoFilledInput
              type="text"
              value={rfqData.siteAddress}
              onChange={(val) => onUpdate("siteAddress", val)}
              onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, siteAddress: false }))}
              isAutoFilled={locationAutoFilled.siteAddress}
              placeholder="e.g., Secunda Refinery, Mpumalanga, South Africa"
              readOnly={isLocationLocked}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Region / Province
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.region}
                onChange={(val) => onUpdate("region", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, region: false }))}
                isAutoFilled={locationAutoFilled.region}
                placeholder="e.g., Gauteng, Western Cape"
                readOnly={isLocationLocked}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
              <AutoFilledInput
                type="text"
                value={rfqData.country}
                onChange={(val) => onUpdate("country", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, country: false }))}
                isAutoFilled={locationAutoFilled.country}
                placeholder="e.g., South Africa"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          {/* Location Confirmation Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            {!locationConfirmed ? (
              <button
                type="button"
                onClick={handleConfirmLocation}
                disabled={!hasRequiredLocationData()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Confirm Location Data
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Location Confirmed
                </div>
                {!isEditingLocation ? (
                  <button
                    type="button"
                    onClick={handleEditLocation}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmLocation}
                    disabled={!hasRequiredLocationData()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
                  >
                    Re-confirm Changes
                  </button>
                )}
              </div>
            )}
            {!hasRequiredLocationData() && !locationConfirmed && (
              <p className="mt-2 text-sm text-amber-600">
                Please fill in all location fields to confirm this section.
              </p>
            )}
          </div>

          {showMapPicker && (
            <GoogleMapLocationPicker
              apiKey={GOOGLE_MAPS_API_KEY}
              config={getMapConfig()}
              initialLocation={
                isNumber(rfqData.latitude) &&
                isNumber(rfqData.longitude) &&
                Number.isFinite(rfqData.latitude) &&
                Number.isFinite(rfqData.longitude)
                  ? { lat: rfqData.latitude, lng: rfqData.longitude }
                  : undefined
              }
              onLocationSelect={handleLocationSelect}
              onClose={() => setShowMapPicker(false)}
            />
          )}

          {!useNix && rfqData.requiredProducts?.includes("surface_protection") && (
            <EnvironmentalIntelligenceSection
              globalSpecs={globalSpecs}
              rfqData={rfqData}
              isUnregisteredCustomer={isUnregisteredCustomer}
              isLoadingEnvironmental={isLoadingEnvironmental}
              environmentalErrors={environmentalErrors}
              environmentalConfirmed={environmentalConfirmed}
              isEditingEnvironmental={isEditingEnvironmental}
              isEnvironmentalLocked={isEnvironmentalLocked}
              wasAutoFilled={wasAutoFilled}
              markAsOverridden={markAsOverridden}
              updateEnvironmentalField={updateEnvironmentalField}
              onUpdateGlobalSpecs={onUpdateGlobalSpecs}
              onUpdate={onUpdate}
              handleConfirmEnvironmental={handleConfirmEnvironmental}
              handleEditEnvironmental={handleEditEnvironmental}
              hasRequiredEnvironmentalData={hasRequiredEnvironmentalData}
              showRestrictionTooltip={showRestrictionTooltip}
              hideRestrictionTooltip={hideRestrictionTooltip}
            />
          )}
        </div>
      </div>
      {/* No Documents Confirmation Popup */}
      {showNoDocumentsPopup && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Documents Uploaded</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You haven't uploaded any supporting documents. Documents such as specifications,
              drawings, or requirements help suppliers provide accurate quotes.
            </p>
            <p className="text-gray-700 font-medium mb-4">
              Would you like to proceed without uploading documents?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  log.debug("📄 User confirmed: Skip documents");
                  setShowNoDocumentsPopup(false);
                  setDocumentsConfirmed(true);
                  onUpdate("skipDocuments", true);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Proceed Without Documents
              </button>
              <button
                type="button"
                onClick={() => setShowNoDocumentsPopup(false)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Mine Modal */}
      <AddMineModal
        isOpen={showAddMineModal}
        onClose={() => setShowAddMineModal(false)}
        onMineCreated={handleMineCreated}
      />
      {/* Restriction Popup for Unregistered Customers */}
      {restrictionPopup && <RestrictionTooltip position={restrictionPopup} />}
      {ConfirmDialog}
      {showLocationRequiredModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-required-title"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-md" />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3
                      id="location-required-title"
                      className="text-base font-semibold text-gray-900"
                    >
                      Project location needed
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      We couldn't detect a project location from your email or BOQ. Pick a SA mine
                      from the list (auto-fills latitude / longitude / region / address) — or close
                      this and use the manual fields and Pick on Map button further down.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="location-required-mine-select"
                    className="block text-xs font-semibold text-gray-900 mb-1"
                  >
                    Quick select: SA Mine
                  </label>
                  <select
                    id="location-required-mine-select"
                    value={pendingMineSelection ?? ""}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const mineId = rawValue ? Number.parseInt(rawValue, 10) : null;
                      setPendingMineSelection(mineId);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a mine --</option>
                    {mines.map((mine) => (
                      <option key={mine.id} value={mine.id}>
                        {mine.mineName}
                        {mine.operatingCompany ? ` (${mine.operatingCompany})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationRequiredModal(false);
                      setPendingMineSelection(null);
                      setShowAddMineModal(true);
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Mine not in the list? Add it
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationRequiredModal(false);
                    setPendingMineSelection(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                >
                  Fill in manually
                </button>
                <button
                  type="button"
                  disabled={pendingMineSelection === null}
                  onClick={async () => {
                    const mineId = pendingMineSelection;
                    if (mineId === null) return;
                    setShowLocationRequiredModal(false);
                    setPendingMineSelection(null);
                    await handleMineSelect(mineId);
                  }}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    pendingMineSelection === null
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Accept this location
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
