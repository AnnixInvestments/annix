'use client';

import * as React from 'react';
import { SearchableSelect, SearchableSelectOption } from './SearchableSelect';
import { CURRENCIES, formatCurrencyLabel, DEFAULT_CURRENCY } from '@/app/lib/currencies';

interface CurrencySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const currencyOptions: SearchableSelectOption[] = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: formatCurrencyLabel(currency),
  searchTerms: [currency.country, currency.symbol],
}));

const CurrencySelect = React.forwardRef<HTMLButtonElement, CurrencySelectProps>(
  ({ id, value, onChange, placeholder = 'Select currency...', className, disabled, open, onOpenChange }, ref) => {
    return (
      <SearchableSelect
        ref={ref}
        id={id}
        value={value}
        onChange={onChange}
        options={currencyOptions}
        placeholder={placeholder}
        searchPlaceholder="Search by country, code or currency name..."
        className={className}
        disabled={disabled}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }
);

CurrencySelect.displayName = 'CurrencySelect';

export { CurrencySelect, DEFAULT_CURRENCY };
export type { CurrencySelectProps };
