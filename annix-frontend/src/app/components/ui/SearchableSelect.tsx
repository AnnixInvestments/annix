'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchTerms?: string[];
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  filterFn?: (option: SearchableSelectOption, searchTerm: string) => boolean;
}

const defaultFilterFn = (option: SearchableSelectOption, searchTerm: string): boolean => {
  const term = searchTerm.toLowerCase();
  if (option.label.toLowerCase().includes(term)) return true;
  if (option.value.toLowerCase().includes(term)) return true;
  if (option.searchTerms?.some((t) => t.toLowerCase().includes(term))) return true;
  return false;
};

const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(
  (
    {
      id,
      value,
      onChange,
      options,
      placeholder = 'Select...',
      searchPlaceholder = 'Search...',
      className,
      disabled,
      open: controlledOpen,
      onOpenChange,
      filterFn = defaultFilterFn,
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const handleOpenChange = (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
      if (newOpen) {
        setSearchTerm('');
        setHighlightedIndex(0);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    const filteredOptions = React.useMemo(() => {
      if (!searchTerm.trim()) return options;
      return options.filter((option) => filterFn(option, searchTerm));
    }, [options, searchTerm, filterFn]);

    React.useEffect(() => {
      setHighlightedIndex(0);
    }, [filteredOptions]);

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      handleOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    React.useEffect(() => {
      if (listRef.current && highlightedIndex >= 0) {
        const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [highlightedIndex]);

    return (
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            className={`flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-left ${className || ''}`}
          >
            <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDownIcon />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="bg-white border border-gray-200 rounded-md shadow-lg z-50 w-[var(--radix-popover-trigger-width)] max-h-80 overflow-hidden"
            sideOffset={4}
            align="start"
          >
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`relative flex items-center w-full px-8 py-2 text-sm rounded cursor-pointer select-none text-left ${
                      index === highlightedIndex ? 'bg-green-50' : ''
                    } ${option.value === value ? 'text-green-700 font-medium' : 'text-gray-900'} hover:bg-green-50`}
                  >
                    {option.value === value && (
                      <span className="absolute left-2 inline-flex items-center">
                        <CheckIcon />
                      </span>
                    )}
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { SearchableSelect };
export type { SearchableSelectProps };
