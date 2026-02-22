"use client";

import React from "react";

interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export function FieldError({ error, className = "" }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p className={`mt-1 text-xs text-red-600 flex items-center gap-1 ${className}`}>
      <svg
        className="w-3 h-3 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {error}
    </p>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  hint?: string;
}

export function FormField({
  label,
  required = false,
  error,
  children,
  className = "",
  labelClassName = "",
  hint,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className={`block text-xs font-semibold text-gray-900 mb-1 ${labelClassName}`}>
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

export function inputErrorClass(hasError: boolean): string {
  return hasError
    ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
    : "";
}
