import { useCallback, useMemo, useState } from "react";

export interface UseFormStateOptions<TValues extends Record<string, unknown>> {
  initialValues: TValues;
  validate?: (values: TValues) => Partial<Record<keyof TValues, string>>;
}

export interface UseFormStateReturn<TValues extends Record<string, unknown>> {
  values: TValues;
  errors: Partial<Record<keyof TValues, string>>;
  isDirty: boolean;
  isValid: boolean;
  setField: <K extends keyof TValues>(field: K, value: TValues[K]) => void;
  setValues: (values: Partial<TValues>) => void;
  setError: <K extends keyof TValues>(field: K, error: string | null) => void;
  validate: () => boolean;
  reset: (next?: TValues) => void;
}

export function useFormState<TValues extends Record<string, unknown>>(
  options: UseFormStateOptions<TValues>,
): UseFormStateReturn<TValues> {
  const [values, setValuesState] = useState<TValues>(options.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, string>>>({});
  const [isDirty, setIsDirty] = useState(false);

  const setField = useCallback(<K extends keyof TValues>(field: K, value: TValues[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setValues = useCallback((next: Partial<TValues>) => {
    setValuesState((prev) => ({ ...prev, ...next }));
    setIsDirty(true);
  }, []);

  const setError = useCallback(<K extends keyof TValues>(field: K, error: string | null) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (error === null) {
        delete next[field];
      } else {
        next[field] = error;
      }
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    if (!options.validate) return true;
    const result = options.validate(values);
    setErrors(result);
    return Object.keys(result).length === 0;
  }, [options, values]);

  const reset = useCallback(
    (next?: TValues) => {
      setValuesState(next ?? options.initialValues);
      setErrors({});
      setIsDirty(false);
    },
    [options.initialValues],
  );

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  return {
    values,
    errors,
    isDirty,
    isValid,
    setField,
    setValues,
    setError,
    validate,
    reset,
  };
}
