'use client';

import { useState, useCallback } from 'react';
import {
  fetchEnvironmentalData,
  type EnvironmentalData,
  type EnvironmentalFetchResult,
} from '../services/environmentalIntelligence';

export interface UseEnvironmentalIntelligenceResult {
  /** Whether environmental data is currently being fetched */
  isLoading: boolean;
  /** Errors encountered during fetch */
  errors: string[];
  /** Set of field names that were auto-filled */
  autoFilledFields: Set<string>;
  /** Metadata from the fetch (distance to coast, humidity, etc.) */
  metadata: EnvironmentalFetchResult['metadata'] | null;
  /**
   * Fetch environmental data for a location and update form specs
   * @param lat Latitude
   * @param lng Longitude
   * @param region Optional region name for industrial pollution estimation
   * @param country Optional country name for industrial pollution estimation
   * @returns The environmental data that was applied
   */
  fetchAndApply: (
    lat: number,
    lng: number,
    region?: string,
    country?: string
  ) => Promise<EnvironmentalData>;
  /** Clear the auto-filled fields tracking */
  clearAutoFilled: () => void;
  /** Check if a specific field was auto-filled */
  wasAutoFilled: (fieldName: string) => boolean;
  /** Mark a field as manually overridden (removes auto-filled styling) */
  markAsOverridden: (fieldName: string) => void;
}

/**
 * Hook for managing environmental intelligence auto-fill
 * Handles fetching, loading state, and tracking which fields were auto-filled
 */
export function useEnvironmentalIntelligence(): UseEnvironmentalIntelligenceResult {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<EnvironmentalFetchResult['metadata'] | null>(null);

  const fetchAndApply = useCallback(
    async (
      lat: number,
      lng: number,
      region?: string,
      country?: string
    ): Promise<EnvironmentalData> => {
      setIsLoading(true);
      setErrors([]);

      try {
        const result = await fetchEnvironmentalData(
          { lat, lng },
          { region, country }
        );

        // Track which fields were populated
        const fieldsApplied = new Set<string>();
        Object.entries(result.data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            fieldsApplied.add(key);
          }
        });

        setAutoFilledFields(fieldsApplied);
        setMetadata(result.metadata);

        if (result.errors.length > 0) {
          setErrors(result.errors);
        }

        return result.data;
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to fetch environmental data';
        setErrors([errorMessage]);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearAutoFilled = useCallback(() => {
    setAutoFilledFields(new Set());
    setErrors([]);
    setMetadata(null);
  }, []);

  const wasAutoFilled = useCallback(
    (fieldName: string) => autoFilledFields.has(fieldName),
    [autoFilledFields]
  );

  const markAsOverridden = useCallback(
    (fieldName: string) => {
      setAutoFilledFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    },
    []
  );

  return {
    isLoading,
    errors,
    autoFilledFields,
    metadata,
    fetchAndApply,
    clearAutoFilled,
    wasAutoFilled,
    markAsOverridden,
  };
}
