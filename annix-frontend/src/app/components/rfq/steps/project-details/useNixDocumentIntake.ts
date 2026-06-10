"use client";
import { useCallback } from "react";
import { type ExtractionBatchContext } from "@/app/components/ExtractionProgressModal";
import { PRODUCTS_AND_SERVICES, PROJECT_TYPES } from "@/app/lib/config/productsServices";
import { generateUniqueId, nowMillis } from "@/app/lib/datetime";
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
import { detectProjectTypeFromEmail, isExcelFile } from "./helpers";

const PIPING_ITEM_TYPES = new Set<string>([
  "pipe",
  "bend",
  "reducer",
  "tee",
  "lateral",
  "flange",
  "end_cap",
  "elbow",
  "expansion_joint",
  "puddle_pipe",
  "manifold",
]);

// Infers PRODUCTS_AND_SERVICES checkbox values from a single extracted BOQ
// item, using the item's own type + lining/coating rather than the coarse
// supplier-bundle key. Bundle keys collapse a rubber-lined TANK into
// "rubber-lined-steel" → the "fabricated_steel" product (labelled "Steel
// Pipes"), which is wrong; reading itemType directly lets a tank select
// "Tanks & Chutes", a lined item select "Surface Protection", an instrument
// select "Valves, Meters & Instruments", etc.
function productsForExtractedItem(item: NixExtractedItem): string[] {
  const products: string[] = [];
  const type = item.itemType;
  const productType = item.productType;
  if (PIPING_ITEM_TYPES.has(type)) {
    if (productType === "hdpe") products.push("hdpe");
    else if (productType === "pvc" || productType === "upvc") products.push("pvc");
    else products.push("fabricated_steel");
  }
  if (type === "upvc") products.push("pvc");
  if (type === "tank_chute" || type === "skid") products.push("tanks_chutes");
  if (type === "valve" || type === "instrument") products.push("valves_meters_instruments");
  if (type === "pump") products.push("pumps");
  if (type === "consumable") products.push("fasteners_gaskets");
  const liningType = item.liningType;
  const coatingSystem = item.coatingSystem;
  const surfacePrepStandard = item.surfacePrepStandard;
  if (liningType || coatingSystem || surfacePrepStandard) {
    products.push("surface_protection");
  }
  return products;
}

type NixDocumentIntakeDeps = {
  nixProcessDocuments: (...args: any[]) => any;
  onUpdate: (field: string, value: any) => void;
  storeAddDocument: (...args: any[]) => any;
  storeAddTenderDocument: (...args: any[]) => any;
  mergeSpecMetadataIntoGlobalSpecs: (...args: any[]) => any;
  currentDraftId: any;
  setWizardCurrentStep: (...args: any[]) => any;
  applyNixItemsToRfq: (...args: any[]) => any;
  showToast: (...args: any[]) => any;
  showExtraction: (...args: any[]) => any;
  hideExtraction: (...args: any[]) => any;
  confirm: (...args: any[]) => any;
  customer: any;
  profile: any;
  setBoqExtractionSummary: (...args: any[]) => any;
  customerAutoFilled: any;
  setCustomerAutoFilled: (...args: any[]) => any;
  setEmailLocationSearchText: (...args: any[]) => any;
  pendingDocuments: any;
  nixExtractionQueueRef: { current: Promise<unknown> };
  nixBatchStateRef: { current: any };
  globalSpecs: any;
  rfqData: any;
  useNix: any;
};

export function useNixDocumentIntake(deps: NixDocumentIntakeDeps) {
  const {
    nixProcessDocuments,
    onUpdate,
    storeAddDocument,
    storeAddTenderDocument,
    mergeSpecMetadataIntoGlobalSpecs,
    currentDraftId,
    setWizardCurrentStep,
    applyNixItemsToRfq,
    showToast,
    showExtraction,
    hideExtraction,
    confirm,
    customer,
    profile,
    setBoqExtractionSummary,
    customerAutoFilled,
    setCustomerAutoFilled,
    setEmailLocationSearchText,
    pendingDocuments,
    nixExtractionQueueRef,
    nixBatchStateRef,
    globalSpecs,
    rfqData,
    useNix,
  } = deps;

  const reserveNixBatchSlot = useCallback((estimatedMs: number) => {
    if (!nixBatchStateRef.current) {
      nixBatchStateRef.current = {
        startedAt: nowMillis(),
        total: 0,
        completed: 0,
        totalEstimateMs: 0,
      };
    }
    nixBatchStateRef.current.total += 1;
    nixBatchStateRef.current.totalEstimateMs += estimatedMs;
  }, []);

  // Snapshot the batch state for showExtraction. Returns undefined
  // when the batch is a singleton (no need to render the overall
  // bar in that case).
  const currentNixBatchContext = useCallback((): ExtractionBatchContext | undefined => {
    const state = nixBatchStateRef.current;
    if (!state || state.total <= 1) return undefined;
    return {
      currentIndex: state.completed + 1,
      total: state.total,
      startedAt: state.startedAt,
      avgPerDocMs: state.totalEstimateMs / state.total,
    };
  }, []);

  // Mark a task as complete. When the last task in the batch
  // finishes, the batch resets so the next drop starts fresh.
  const releaseNixBatchSlot = useCallback(() => {
    const state = nixBatchStateRef.current;
    if (!state) return;
    state.completed += 1;
    if (state.completed >= state.total) {
      nixBatchStateRef.current = null;
    }
  }, []);

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
      const boqEstimatedMs = 30_000;
      reserveNixBatchSlot(boqEstimatedMs);
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
        estimatedDurationMs: boqEstimatedMs,
        batch: currentNixBatchContext(),
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
        releaseNixBatchSlot();
        releaseQueueSlot();
      }
    },
    [
      showExtraction,
      hideExtraction,
      confirm,
      currentDraftId,
      reserveNixBatchSlot,
      currentNixBatchContext,
      releaseNixBatchSlot,
    ],
  );

  // Tender-spec extraction. Sends a non-BOQ PDF (specification,
  // standard, code-of-conduct etc.) through Nix and merges any
  // metadata it can lift (working pressure, working temperature,
  // material standard, coating, lining) into rfqData.globalSpecs.
  // Goes through the same serial queue as BOQ extractions so a
  // batch drop processes one-at-a-time.
  const runNixTenderSpecExtraction = useCallback(
    async (file: File): Promise<void> => {
      const specEstimatedMs = 20_000;
      reserveNixBatchSlot(specEstimatedMs);
      const priorTail = nixExtractionQueueRef.current;
      let releaseQueueSlot: () => void = () => {};
      nixExtractionQueueRef.current = new Promise<void>((resolve) => {
        releaseQueueSlot = resolve;
      });
      try {
        await priorTail;
      } catch {
        // ignored — prior task failure doesn't poison this one
      }
      showExtraction({
        brand: "rfq",
        label: `Nix is reading ${file.name} for specs…`,
        estimatedDurationMs: specEstimatedMs,
        batch: currentNixBatchContext(),
      });
      try {
        const result = await nixApi.uploadAndProcess(file, {
          documentRole: "specification",
          rfqId: currentDraftId ?? undefined,
          sourceModule: "rfq",
        });
        hideExtraction();
        if (result.error) {
          log.warn(`Nix tender-spec extraction returned error for ${file.name}: ${result.error}`);
          return;
        }
        const metadata = result.metadata;
        if (!metadata) return;
        mergeSpecMetadataIntoGlobalSpecs({
          workingPressureBar: metadata.workingPressureBar,
          workingTemperatureC: metadata.workingTemperatureC,
          coating: metadata.coating,
          lining: metadata.lining,
          valveTypes: metadata.valveTypes,
          valveStandards: metadata.valveStandards,
          flangeStandard: metadata.flangeStandard,
          flangeTableDesignation: metadata.flangeTableDesignation,
          ndtMethods: metadata.ndtMethods,
          hydrotestMultiplier: metadata.hydrotestMultiplier,
          hydrotestHoldMinutes: metadata.hydrotestHoldMinutes,
          naceCompliance: metadata.naceCompliance,
          sourService: metadata.sourService,
          gasketType: metadata.gasketType,
          valveClauseExcerpt: metadata.valveClauseExcerpt,
          materialGrade: metadata.materialGrade,
        });
      } catch (err) {
        hideExtraction();
        // Spec extraction is opportunistic — a failure shouldn't
        // surface a blocking modal the way BOQ extraction does.
        // The doc is still uploaded + archived; admin can pull
        // specs manually if needed.
        log.warn(`Nix tender-spec extraction failed for ${file.name}:`, err);
      } finally {
        releaseNixBatchSlot();
        releaseQueueSlot();
      }
    },
    [
      showExtraction,
      hideExtraction,
      mergeSpecMetadataIntoGlobalSpecs,
      currentDraftId,
      reserveNixBatchSlot,
      currentNixBatchContext,
      releaseNixBatchSlot,
    ],
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
        setCustomerAutoFilled((prev: any) => {
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

  const applyProductSelectionsFromItems = useCallback(
    (items: NixExtractedItem[]): string[] => {
      const detected = new Set<string>();
      for (const item of items) {
        for (const productValue of productsForExtractedItem(item)) detected.add(productValue);
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
          // Spec extraction runs through Nix and mirrors the file
          // to S3 internally — no separate archive call needed.
          // Fire-and-forget: the queue serialises the work and
          // failures don't block the wizard.
          void runNixTenderSpecExtraction(incoming);
        } else if (kind === "quality") {
          // ITP / QCP / data-book: preserve + flag for the (future) quality
          // module. Not BOM- or spec-extracted — it carries no priceable line
          // items and its text would pollute the pricing specs.
          storeAddTenderDocument({ file: incoming, id: tenderId });
          archiveToS3(incoming, "other");
        } else if (kind === "boq" || kind === "drawing") {
          storeAddDocument({ file: incoming, id: docId });
          // BOM extraction (role=drawing) mirrors the file to S3 itself.
          // Merge the extracted line items into the wizard's Step 3 list.
          const result = await runNixBoqExtraction(incoming);
          if (result && result.items.length > 0) {
            applyNixItemsToRfq(result.items);
            applyProductSelectionsFromItems(result.items);
          }
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

      // The covering letter often carries the blanket surface-protection scope
      // (lining product + thickness, blast standard, fittings lining) that the
      // drawings don't print per row. Run the email body through the same
      // tender-spec extraction so those specs pre-fill the wizard's global
      // specs alongside the customer details.
      const emailBody = parsed.metadata.bodyText;
      if (emailBody && emailBody.trim().length > 60) {
        const bodyFileName = `${incoming.name.replace(/\.eml$/i, "")} — covering email.txt`;
        const bodyFile = new File([emailBody], bodyFileName, { type: "text/plain" });
        void runNixTenderSpecExtraction(bodyFile);
      }

      const routeAttachment = (attachment: EmailAttachment) => {
        const idPrefix =
          attachment.kind === "tender" || attachment.kind === "quality" ? "tender" : "doc";
        const id = `${idPrefix}-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`;
        if (attachment.kind === "tender") {
          storeAddTenderDocument({ file: attachment.file, id });
          // Run Nix spec extraction so tender PDFs surfaced through
          // an .eml drop pre-populate globalSpecs the same way as a
          // direct drop does. Fire-and-forget through the queue.
          if (!isExcelFile(attachment.file)) {
            void runNixTenderSpecExtraction(attachment.file);
          }
        } else if (attachment.kind === "quality") {
          // ITP / QCP / data-book: preserve + flag for the future quality
          // module. Not BOM/spec-extracted — see direct-drop branch above.
          storeAddTenderDocument({ file: attachment.file, id });
          archiveToS3(attachment.file, "other");
        } else {
          storeAddDocument({ file: attachment.file, id });
          // Excel + drawing attachments are BOM-extracted in runAllExtractions
          // (which mirrors them to S3). Images / other files get archived here.
          if (!isExcelFile(attachment.file) && attachment.kind !== "drawing") {
            archiveToS3(attachment.file, "other");
          }
        }
      };
      parsed.attachments.forEach(routeAttachment);

      // BOM-extract every spreadsheet BOQ AND every drawing PDF in the email
      // — previously only Excel attachments were extracted, so drawings
      // (which carry the BOM on these fabrication RFQs) produced no line
      // items. Tender specs and quality docs are excluded (handled above).
      const bomAttachments = parsed.attachments.filter(
        (att) => att.kind === "boq" || att.kind === "drawing",
      );
      type ExtractionResultBundle = {
        profiles: NixRfqPipingProfileMetadata[];
        items: NixExtractedItem[];
        metadatas: NixExtractionMetadata[];
      };
      const runAllExtractions = async (): Promise<ExtractionResultBundle> => {
        const profiles: NixRfqPipingProfileMetadata[] = [];
        const items: NixExtractedItem[] = [];
        const metadatas: NixExtractionMetadata[] = [];
        for (const attachment of bomAttachments) {
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
      const newlySelectedProducts = applyProductSelectionsFromItems(extractionBundle.items);

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
        const drawingCount = parsed.attachments.filter((a) => a.kind === "drawing").length;
        const tenderCount = parsed.attachments.filter((a) => a.kind === "tender").length;
        const qualityCount = parsed.attachments.filter((a) => a.kind === "quality").length;
        const otherCount =
          parsed.attachments.length - boqCount - drawingCount - tenderCount - qualityCount;
        if (boqCount > 0)
          lines.push(
            `• ${boqCount} spreadsheet BOQ${boqCount === 1 ? "" : "s"} → line-item extraction`,
          );
        if (drawingCount > 0)
          lines.push(`• ${drawingCount} drawing${drawingCount === 1 ? "" : "s"} → BOM extraction`);
        if (tenderCount > 0)
          lines.push(
            `• ${tenderCount} tender/spec document${tenderCount === 1 ? "" : "s"} → Specifications`,
          );
        if (qualityCount > 0)
          lines.push(
            `• ${qualityCount} quality document${qualityCount === 1 ? "" : "s"} (ITP/QCP) → preserved for quality review`,
          );
        if (otherCount > 0)
          lines.push(`• ${otherCount} other attachment${otherCount === 1 ? "" : "s"} → attached`);

        if (bomAttachments.length > 0 && totalItems > 0) {
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
      applyProductSelectionsFromItems(extractionBundle.items);

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
      applyProductSelectionsFromItems,
      applyNixItemsToRfq,
      runNixBoqExtraction,
      setWizardCurrentStep,
      archiveToS3,
    ],
  );
  return { onAddDocument };
}
