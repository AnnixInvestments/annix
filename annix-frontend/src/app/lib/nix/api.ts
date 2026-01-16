'use client';

import { browserBaseUrl } from '@/lib/api-config';

export interface NixExtractedItem {
  rowNumber: number;
  itemNumber: string;
  description: string;
  itemType: 'pipe' | 'bend' | 'reducer' | 'tee' | 'flange' | 'expansion_joint' | 'unknown';
  material: string | null;
  materialGrade: string | null;
  diameter: number | null;
  diameterUnit: 'mm' | 'inch';
  secondaryDiameter: number | null;
  length: number | null;
  wallThickness: number | null;
  schedule: string | null;
  angle: number | null;
  flangeConfig: 'none' | 'one_end' | 'both_ends' | 'puddle' | 'blind' | null;
  quantity: number;
  unit: string;
  confidence: number;
  needsClarification: boolean;
  clarificationReason: string | null;
}

export interface NixClarificationContext {
  rowNumber?: number;
  itemNumber?: string;
  itemDescription?: string;
  itemType?: string;
  extractedMaterial?: string | null;
  extractedDiameter?: number | null;
  extractedLength?: number | null;
  extractedAngle?: number | null;
  extractedFlangeConfig?: string | null;
  extractedQuantity?: number;
  confidence?: number;
  clarificationReason?: string | null;
  isSpecificationHeader?: boolean;
  cellRef?: string;
  rawText?: string;
  parsedMaterialGrade?: string | null;
  parsedWallThickness?: string | null;
  parsedLining?: string | null;
  parsedExternalCoating?: string | null;
  parsedStandard?: string | null;
  parsedSchedule?: string | null;
  missingFields?: string[];
}

export interface NixClarificationDto {
  id: number;
  question: string;
  context: NixClarificationContext;
}

export interface NixExtractionMetadata {
  projectReference?: string | null;
  projectLocation?: string | null;
  projectName?: string | null;
  standard?: string | null;
  coating?: string | null;
  lining?: string | null;
  materialGrade?: string | null;
  wallThickness?: string | null;
}

export interface NixProcessResponse {
  extractionId: number;
  status: string;
  items?: NixExtractedItem[];
  pendingClarifications?: NixClarificationDto[];
  metadata?: NixExtractionMetadata;
  error?: string;
}

export interface NixCorrectionPayload {
  extractionId?: number;
  itemDescription: string;
  fieldName: string;
  originalValue: string | number | null;
  correctedValue: string | number;
  userId?: number;
}

export const nixApi = {
  uploadAndProcess: async (file: File, userId?: number, rfqId?: number): Promise<NixProcessResponse> => {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object provided to Nix upload');
    }

    if (file.size === 0) {
      throw new Error('Cannot upload empty file to Nix');
    }

    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Cannot read "${file.name}". The file may be open in another application (like Excel). Please close it and try again.`
      );
    }

    const blob = new Blob([fileData], { type: file.type });
    const formData = new FormData();
    formData.append('file', blob, file.name);
    if (userId) formData.append('userId', userId.toString());
    if (rfqId) formData.append('rfqId', rfqId.toString());

    const uploadUrl = '/api/nix/upload';
    console.log('[Nix] Uploading via API route:', uploadUrl, 'File:', file.name, 'Size:', file.size);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process document: ${errorText}`);
    }

    return response.json();
  },

  extraction: async (extractionId: number): Promise<NixProcessResponse> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get extraction: ${errorText}`);
    }

    return response.json();
  },

  pendingClarifications: async (extractionId: number): Promise<NixClarificationDto[]> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}/clarifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get clarifications: ${errorText}`);
    }

    return response.json();
  },

  submitClarification: async (
    clarificationId: number,
    responseText: string,
    allowLearning: boolean = true
  ): Promise<{ success: boolean; remainingClarifications: number }> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/clarification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clarificationId,
        responseType: 'text',
        responseText,
        allowLearning,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit clarification: ${errorText}`);
    }

    return response.json();
  },

  skipClarification: async (clarificationId: number): Promise<{ success: boolean }> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/clarification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clarificationId,
        responseType: 'text',
        responseText: '[SKIPPED]',
        allowLearning: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to skip clarification: ${errorText}`);
    }

    return response.json();
  },

  submitCorrection: async (correction: NixCorrectionPayload): Promise<{ success: boolean }> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/learning/correction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(correction),
    });

    if (!response.ok) {
      console.warn('[Nix] Failed to submit correction:', await response.text());
      return { success: false };
    }

    return response.json();
  },
};
