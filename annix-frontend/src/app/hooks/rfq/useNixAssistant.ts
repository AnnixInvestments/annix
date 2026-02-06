'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  nixApi,
  type NixExtractedItem,
  type NixClarificationDto,
} from '@/app/lib/nix';
import { generateUniqueId, nowMillis } from '@/app/lib/datetime';
import { log } from '@/app/lib/logger';
import type { PipeItem, StraightPipeEntry, BendEntry, FittingEntry, GlobalSpecs } from '@/app/lib/hooks/useRfqForm';
import type { PendingDocument } from '@/app/components/rfq/steps/ProjectDetailsStep';

function generateClientItemNumber(customerName: string, index: number): string {
  const prefix = customerName.slice(0, 3).toUpperCase();
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

export interface UseNixAssistantProps {
  pendingDocuments: PendingDocument[];
  rfqData: {
    nixPopupShown?: boolean;
    useNix?: boolean;
    customerName?: string;
    siteAddress?: string;
    projectName?: string;
    globalSpecs?: GlobalSpecs;
    items?: PipeItem[];
  };
  updateRfqField: (field: string, value: any) => void;
  setCurrentStep: (step: number) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface UseNixAssistantReturn {
  showNixPopup: boolean;
  isNixProcessing: boolean;
  nixProcessingProgress: number;
  nixProcessingStatus: string;
  nixProcessingTimeRemaining: number | undefined;
  nixExtractionId: number | null;
  nixExtractedItems: NixExtractedItem[];
  nixClarifications: NixClarificationDto[];
  currentClarificationIndex: number;
  showNixClarification: boolean;
  nixFormHelperVisible: boolean;
  nixFormHelperMinimized: boolean;

  handleShowNixPopup: () => void;
  handleNixYes: () => void;
  handleNixNo: () => void;
  handleStopUsingNix: () => void;
  handleNixFormHelperClose: () => void;
  handleNixFormHelperReactivate: () => void;
  handleProcessDocumentsWithNix: () => Promise<void>;
  handleClarificationSubmit: (clarificationId: number, response: string) => Promise<void>;
  handleClarificationSkip: (clarificationId: number) => Promise<void>;
  handleCloseClarification: () => void;
  handleItemsPageReady: () => void;
}

export function useNixAssistant({
  pendingDocuments,
  rfqData,
  updateRfqField,
  setCurrentStep,
  showToast,
}: UseNixAssistantProps): UseNixAssistantReturn {
  const [showNixPopup, setShowNixPopup] = useState(false);
  const [isNixProcessing, setIsNixProcessing] = useState(false);
  const [nixProcessingProgress, setNixProcessingProgress] = useState(0);
  const [nixProcessingStatus, setNixProcessingStatus] = useState('Initializing...');
  const [nixProcessingTimeRemaining, setNixProcessingTimeRemaining] = useState<number | undefined>(undefined);
  const [nixExtractionId, setNixExtractionId] = useState<number | null>(null);
  const [nixExtractedItems, setNixExtractedItems] = useState<NixExtractedItem[]>([]);
  const [nixClarifications, setNixClarifications] = useState<NixClarificationDto[]>([]);
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState(0);
  const [showNixClarification, setShowNixClarification] = useState(false);
  const [nixFormHelperVisible, setNixFormHelperVisible] = useState(true);
  const [nixFormHelperMinimized, setNixFormHelperMinimized] = useState(false);

  const handleShowNixPopup = useCallback(() => {
    log.debug('handleShowNixPopup called, nixPopupShown:', rfqData.nixPopupShown);
    if (!rfqData.nixPopupShown) {
      log.debug('Setting showNixPopup to true');
      setShowNixPopup(true);
    }
  }, [rfqData.nixPopupShown]);

  const handleNixYes = useCallback(() => {
    updateRfqField('useNix', true);
    updateRfqField('nixPopupShown', true);
    updateRfqField('requiredProducts', ['fabricated_steel']);
    setShowNixPopup(false);
  }, [updateRfqField]);

  const handleNixNo = useCallback(() => {
    updateRfqField('useNix', false);
    updateRfqField('nixPopupShown', true);
    setShowNixPopup(false);
  }, [updateRfqField]);

  const handleStopUsingNix = useCallback(() => {
    updateRfqField('useNix', false);
    updateRfqField('nixPopupShown', false);
  }, [updateRfqField]);

  const handleNixFormHelperClose = useCallback(() => {
    setNixFormHelperVisible(false);
    setNixFormHelperMinimized(true);
  }, []);

  const handleNixFormHelperReactivate = useCallback(() => {
    setNixFormHelperVisible(true);
    setNixFormHelperMinimized(false);
  }, []);

  const handleItemsPageReady = useCallback(() => {
    if (isNixProcessing && pendingDocuments.length > 0) {
      setNixProcessingProgress(100);
      setNixProcessingStatus('Complete!');
      setTimeout(() => {
        setIsNixProcessing(false);
        showToast(`Nix processed ${pendingDocuments.length} document(s) successfully!`, 'success');
      }, 300);
    }
  }, [isNixProcessing, pendingDocuments.length, showToast]);

  const convertNixItemsToRfqItems = useCallback((nixItems: NixExtractedItem[]) => {
    const customerName = rfqData.customerName || 'NIX';
    const allItems: PipeItem[] = [];
    let itemIndex = 0;

    const flangeMap: Record<string, 'FBE' | 'FOE' | 'PE'> = {
      'one_end': 'FOE',
      'both_ends': 'FBE',
      'none': 'PE',
      'puddle': 'FBE',
      'blind': 'FBE',
    };

    for (const item of nixItems) {
      if (!item.diameter) continue;

      itemIndex++;
      const unitLower = (item.unit || '').toLowerCase().trim();
      const isMetersUnit = unitLower === 'm' || unitLower === 'meters' || unitLower === 'metre' || unitLower === 'metres' || unitLower === 'lm';

      const materialNote = item.material ? ` | Material: ${item.material}${item.materialGrade ? ` (${item.materialGrade})` : ''}` : '';
      const wallNote = item.wallThickness ? ` | Wall: ${item.wallThickness}mm` : '';
      const nixNote = `Extracted by Nix from Row ${item.rowNumber} (${Math.round(item.confidence * 100)}% confidence)${materialNote}${wallNote}`;

      log.debug(`Converting Nix item ${item.rowNumber}: material=${item.material}, wallThickness=${item.wallThickness}, unit=${item.unit}, isMeters=${isMetersUnit}`);

      if (item.itemType === 'pipe' || item.itemType === 'flange') {
        const pipeEntry: StraightPipeEntry = {
          id: generateUniqueId(),
          itemType: 'straight_pipe' as const,
          clientItemNumber: item.itemNumber || generateClientItemNumber(customerName, itemIndex),
          description: item.description,
          specs: {
            nominalBoreMm: item.diameter,
            scheduleType: item.schedule ? 'schedule' : (item.wallThickness ? 'wall_thickness' : 'schedule'),
            scheduleNumber: item.schedule || undefined,
            wallThicknessMm: item.wallThickness || undefined,
            pipeEndConfiguration: flangeMap[item.flangeConfig || 'none'] || 'PE',
            individualPipeLength: isMetersUnit ? 6000 : (item.length || 6000),
            lengthUnit: 'meters' as const,
            quantityType: isMetersUnit ? 'total_length' as const : 'number_of_pipes' as const,
            quantityValue: item.quantity || 1,
            workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
            workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
          },
          notes: nixNote,
        };
        allItems.push(pipeEntry);
      } else if (item.itemType === 'bend') {
        const bendEntry: BendEntry = {
          id: generateUniqueId(),
          itemType: 'bend' as const,
          clientItemNumber: item.itemNumber || generateClientItemNumber(customerName, itemIndex),
          description: item.description,
          specs: {
            nominalBoreMm: item.diameter,
            scheduleNumber: item.schedule || undefined,
            wallThicknessMm: item.wallThickness || undefined,
            bendType: '1.5D',
            bendDegrees: item.angle || 90,
            numberOfTangents: 0,
            numberOfStubs: 0,
            quantityValue: item.quantity || 1,
            quantityType: 'number_of_items' as const,
            workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
            workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
          },
          notes: nixNote,
        };
        allItems.push(bendEntry);
      } else if (item.itemType === 'tee' || item.itemType === 'reducer' || item.itemType === 'expansion_joint') {
        const fittingType = item.itemType === 'tee' ? 'EQUAL_TEE'
          : item.itemType === 'reducer' ? 'CONCENTRIC_REDUCER'
          : 'EXPANSION_LOOP';

        const fittingEntry: FittingEntry = {
          id: generateUniqueId(),
          itemType: 'fitting' as const,
          clientItemNumber: item.itemNumber || generateClientItemNumber(customerName, itemIndex),
          description: item.description,
          specs: {
            fittingStandard: 'SABS719',
            fittingType: fittingType,
            nominalDiameterMm: item.diameter,
            scheduleNumber: item.schedule || undefined,
            quantityValue: item.quantity || 1,
            quantityType: 'number_of_items' as const,
            workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
            workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
          },
          notes: nixNote,
        };
        allItems.push(fittingEntry);
      }
    }

    if (allItems.length > 0) {
      log.debug(`Converting ${allItems.length} Nix items to RFQ items`);
      updateRfqField('items', [...(rfqData.items || []), ...allItems]);
    }
  }, [rfqData.customerName, rfqData.globalSpecs, rfqData.items, updateRfqField]);

  const handleProcessDocumentsWithNix = useCallback(async () => {
    if (!pendingDocuments || pendingDocuments.length === 0) {
      log.warn('No documents to process with Nix');
      return;
    }

    setIsNixProcessing(true);
    setNixProcessingProgress(0);
    setNixProcessingStatus('Uploading document...');
    setNixProcessingTimeRemaining(15);
    log.debug(`Processing ${pendingDocuments.length} document(s) with Nix...`);

    const startTime = nowMillis();
    const allClarifications: NixClarificationDto[] = [];

    try {
      for (let i = 0; i < pendingDocuments.length; i++) {
        const doc = pendingDocuments[i];
        const docProgress = (i / pendingDocuments.length) * 100;

        setNixProcessingProgress(docProgress + 5);
        setNixProcessingStatus(`Uploading ${doc.file.name}...`);
        setNixProcessingTimeRemaining(12);

        log.debug(`Processing document: ${doc.file.name}, size: ${doc.file.size} bytes, type: ${doc.file.type}`);

        setNixProcessingProgress(docProgress + 15);
        setNixProcessingStatus('Reading document structure...');
        setNixProcessingTimeRemaining(10);

        const result = await nixApi.uploadAndProcess(doc.file);

        setNixProcessingProgress(docProgress + 40);
        setNixProcessingStatus('Extracting pipe specifications...');
        setNixProcessingTimeRemaining(7);

        log.debug('Nix extraction result:', result);
        setNixExtractionId(result.extractionId);

        setNixProcessingProgress(docProgress + 60);
        setNixProcessingStatus('Analyzing line items...');
        setNixProcessingTimeRemaining(5);

        if (result.items && result.items.length > 0) {
          setNixExtractedItems(result.items);
          log.debug(`Extracted ${result.items.length} items`);

          setNixProcessingProgress(docProgress + 70);
          setNixProcessingStatus(`Found ${result.items.length} items, populating RFQ...`);
          setNixProcessingTimeRemaining(5);

          await new Promise(resolve => setTimeout(resolve, 300));

          const totalItems = result.items.length;
          for (let itemIdx = 0; itemIdx < totalItems; itemIdx++) {
            const itemProgress = docProgress + 70 + ((itemIdx / totalItems) * 20);
            setNixProcessingProgress(itemProgress);
            setNixProcessingStatus(`Adding item ${itemIdx + 1} of ${totalItems}...`);
            setNixProcessingTimeRemaining(Math.max(1, Math.ceil((totalItems - itemIdx) * 0.3)));

            await new Promise(resolve => setTimeout(resolve, 100));
          }

          convertNixItemsToRfqItems(result.items);

          setNixProcessingProgress(docProgress + 92);
          setNixProcessingStatus('Items added to RFQ');
          setNixProcessingTimeRemaining(2);
        }

        setNixProcessingProgress(docProgress + 85);
        setNixProcessingStatus('Preparing clarification questions...');
        setNixProcessingTimeRemaining(2);

        if (result.pendingClarifications && result.pendingClarifications.length > 0) {
          allClarifications.push(...result.pendingClarifications);
          log.debug(`${result.pendingClarifications.length} clarification(s) needed`);
        }

        if (result.metadata) {
          if (result.metadata.projectLocation && !rfqData.siteAddress) {
            updateRfqField('siteAddress', result.metadata.projectLocation);
            log.debug(`Auto-populated location: ${result.metadata.projectLocation}`);
          }
          if (result.metadata.projectName && !rfqData.projectName) {
            updateRfqField('projectName', result.metadata.projectName);
            log.debug(`Auto-populated project name: ${result.metadata.projectName}`);
          }
        }
      }

      setNixProcessingProgress(95);
      setNixProcessingStatus('Finalizing RFQ...');
      setNixProcessingTimeRemaining(1);

      await new Promise(resolve => setTimeout(resolve, 400));

      const processingTime = ((nowMillis() - startTime) / 1000).toFixed(1);
      log.debug(`Nix processing completed in ${processingTime}s`);

      if (allClarifications.length > 0) {
        setNixProcessingProgress(100);
        setNixProcessingStatus('Complete! Questions needed...');
        setNixProcessingTimeRemaining(0);
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsNixProcessing(false);
        setNixClarifications(allClarifications);
        setCurrentClarificationIndex(0);
        setShowNixClarification(true);
      } else {
        setNixProcessingProgress(98);
        setNixProcessingStatus('Loading Items page...');
        setNixProcessingTimeRemaining(0);
        setCurrentStep(2);

        setTimeout(() => {
          let wasProcessing = false;
          setIsNixProcessing(prev => {
            wasProcessing = prev;
            return prev ? false : prev;
          });
          if (wasProcessing) {
            setNixProcessingProgress(100);
            setNixProcessingStatus('Complete!');
            showToast(`Nix processed ${pendingDocuments.length} document(s) successfully!`, 'success');
          }
        }, 3000);
      }
    } catch (error) {
      log.error('Nix processing error:', error);
      showToast(`Nix processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsNixProcessing(false);
      setNixProcessingProgress(0);
    }
  }, [pendingDocuments, rfqData.siteAddress, rfqData.projectName, updateRfqField, setCurrentStep, showToast, convertNixItemsToRfqItems]);

  const handleClarificationSubmit = useCallback(async (clarificationId: number, response: string) => {
    const isLastQuestion = currentClarificationIndex >= nixClarifications.length - 1;
    log.debug(`Submitting clarification ${clarificationId}, index ${currentClarificationIndex} of ${nixClarifications.length}, isLast: ${isLastQuestion}`);

    try {
      const result = await nixApi.submitClarification(clarificationId, response, true);
      log.debug('Clarification submitted:', result);
    } catch (error) {
      log.error('Failed to submit clarification:', error);
      log.error('Clarification submit error:', error);
    }

    if (!isLastQuestion) {
      setCurrentClarificationIndex(prev => prev + 1);
    } else {
      log.debug('Closing clarification popup and returning to step 1');
      setShowNixClarification(false);
      setCurrentStep(1);
      showToast('All clarifications completed! Please confirm the project location before continuing.', 'success');
    }
  }, [currentClarificationIndex, nixClarifications.length, setCurrentStep, showToast]);

  const handleClarificationSkip = useCallback(async (clarificationId: number) => {
    try {
      await nixApi.skipClarification(clarificationId);
      log.debug('Clarification skipped');

      if (currentClarificationIndex < nixClarifications.length - 1) {
        setCurrentClarificationIndex(prev => prev + 1);
      } else {
        setShowNixClarification(false);
        setCurrentStep(1);
        showToast('Clarifications skipped. Please complete the project details and continue.', 'info');
      }
    } catch (error) {
      log.error('Failed to skip clarification:', error);
    }
  }, [currentClarificationIndex, nixClarifications.length, setCurrentStep, showToast]);

  const handleCloseClarification = useCallback(() => {
    setShowNixClarification(false);
  }, []);

  return {
    showNixPopup,
    isNixProcessing,
    nixProcessingProgress,
    nixProcessingStatus,
    nixProcessingTimeRemaining,
    nixExtractionId,
    nixExtractedItems,
    nixClarifications,
    currentClarificationIndex,
    showNixClarification,
    nixFormHelperVisible,
    nixFormHelperMinimized,

    handleShowNixPopup,
    handleNixYes,
    handleNixNo,
    handleStopUsingNix,
    handleNixFormHelperClose,
    handleNixFormHelperReactivate,
    handleProcessDocumentsWithNix,
    handleClarificationSubmit,
    handleClarificationSkip,
    handleCloseClarification,
    handleItemsPageReady,
  };
}
