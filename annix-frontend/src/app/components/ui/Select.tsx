'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  groupedOptions?: SelectOptionGroup[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

const SelectComponent = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ id, value, onChange, options, groupedOptions, placeholder = 'Select...', className, disabled, loading, open: controlledOpen, onOpenChange, 'aria-required': ariaRequired, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedby, 'aria-label': ariaLabel }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const [shouldScrollToHighlighted, setShouldScrollToHighlighted] = React.useState(false);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const virtualListRef = React.useRef<List>(null);
    const highlightedOptionRef = React.useRef<HTMLButtonElement>(null);

    const ITEM_HEIGHT = 36;
    const MAX_HEIGHT = 256;
    const VIRTUALIZATION_THRESHOLD = 20;

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

    const allOptions = React.useMemo(() => {
      if (groupedOptions) {
        return groupedOptions.flatMap(g => g.options);
      }
      return options;
    }, [options, groupedOptions]);

    const filteredOptions = React.useMemo(() => {
      if (!searchTerm.trim()) return allOptions;
      const term = searchTerm.toLowerCase();
      return allOptions.filter((option) =>
        option.label.toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term)
      );
    }, [allOptions, searchTerm]);

    const filteredGroupedOptions = React.useMemo(() => {
      if (!groupedOptions) return null;
      if (!searchTerm.trim()) return groupedOptions;
      const term = searchTerm.toLowerCase();
      return groupedOptions
        .map(group => ({
          ...group,
          options: group.options.filter(option =>
            option.label.toLowerCase().includes(term) ||
            option.value.toLowerCase().includes(term)
          )
        }))
        .filter(group => group.options.length > 0);
    }, [groupedOptions, searchTerm]);

    React.useEffect(() => {
      setHighlightedIndex(0);
    }, [filteredOptions]);

    const selectedOption = allOptions.find((opt) => opt.value === value);

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;
      onChange(option.value);
      handleOpenChange(false);
    };

    const findNextEnabledIndex = (currentIndex: number, direction: 'up' | 'down'): number => {
      const step = direction === 'down' ? 1 : -1;
      let nextIndex = currentIndex + step;
      while (nextIndex >= 0 && nextIndex < filteredOptions.length) {
        if (!filteredOptions[nextIndex].disabled) {
          return nextIndex;
        }
        nextIndex += step;
      }
      return currentIndex;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setShouldScrollToHighlighted(true);
        setHighlightedIndex((prev) => findNextEnabledIndex(prev, 'down'));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setShouldScrollToHighlighted(true);
        setHighlightedIndex((prev) => findNextEnabledIndex(prev, 'up'));
      } else if (e.key === 'Enter' && filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    React.useEffect(() => {
      if (shouldScrollToHighlighted) {
        if (virtualListRef.current && !filteredGroupedOptions && filteredOptions.length > VIRTUALIZATION_THRESHOLD) {
          virtualListRef.current.scrollToItem(highlightedIndex, 'smart');
        } else if (highlightedOptionRef.current) {
          highlightedOptionRef.current.scrollIntoView({ block: 'nearest' });
        }
        setShouldScrollToHighlighted(false);
      }
    }, [highlightedIndex, shouldScrollToHighlighted, filteredGroupedOptions, filteredOptions.length]);

    return (
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled || loading}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-required={ariaRequired}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            aria-label={ariaLabel}
            className={`flex items-center justify-between w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-left ${className || ''}`}
          >
            <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
              {loading ? 'Loading...' : (selectedOption?.label || placeholder)}
            </span>
            {loading ? <LoadingSpinner /> : <ChevronDownIcon />}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="bg-white border border-gray-200 rounded-md shadow-lg z-[10000] w-[var(--radix-popover-trigger-width)] overflow-hidden"
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
                placeholder="Type to search..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
              ) : filteredGroupedOptions ? (
                (() => {
                  let globalIndex = 0;
                  return filteredGroupedOptions.map((group) => (
                    <div key={group.label}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                        {group.label}
                      </div>
                      {group.options.map((option) => {
                        const currentIndex = globalIndex++;
                        const isHighlighted = currentIndex === highlightedIndex;
                        const isDisabled = option.disabled;
                        return isDisabled ? (
                          <div
                            key={option.value}
                            className="relative flex items-center w-full px-8 py-2 text-sm rounded select-none text-left text-gray-400 cursor-not-allowed"
                            title={option.disabledReason}
                          >
                            {option.label}
                            {option.disabledReason && (
                              <span className="ml-2 text-xs text-red-400">- {option.disabledReason}</span>
                            )}
                          </div>
                        ) : (
                          <button
                            key={option.value}
                            ref={isHighlighted ? highlightedOptionRef : undefined}
                            type="button"
                            onClick={() => handleSelect(option)}
                            onMouseEnter={() => setHighlightedIndex(currentIndex)}
                            className={`relative flex items-center w-full px-8 py-2 text-sm rounded cursor-pointer select-none text-left ${
                              isHighlighted ? 'bg-green-50' : ''
                            } ${option.value === value ? 'text-green-700 font-medium' : 'text-gray-900'} hover:bg-green-50`}
                          >
                            {option.value === value && (
                              <span className="absolute left-2 inline-flex items-center">
                                <CheckIcon />
                              </span>
                            )}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()
              ) : filteredOptions.length > VIRTUALIZATION_THRESHOLD ? (
                <List
                  ref={virtualListRef}
                  height={Math.min(filteredOptions.length * ITEM_HEIGHT, MAX_HEIGHT)}
                  itemCount={filteredOptions.length}
                  itemSize={ITEM_HEIGHT}
                  width="100%"
                  overscanCount={5}
                >
                  {({ index, style }: ListChildComponentProps<SelectOption[]>) => {
                    const option = filteredOptions[index];
                    const isHighlighted = index === highlightedIndex;
                    const isDisabled = option.disabled;
                    return isDisabled ? (
                      <div
                        style={style}
                        className="relative flex items-center w-full px-8 text-sm rounded select-none text-left text-gray-400 cursor-not-allowed"
                        title={option.disabledReason}
                      >
                        {option.label}
                        {option.disabledReason && (
                          <span className="ml-2 text-xs text-red-400">- {option.disabledReason}</span>
                        )}
                      </div>
                    ) : (
                      <button
                        style={style}
                        type="button"
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`relative flex items-center w-full px-8 text-sm rounded cursor-pointer select-none text-left ${
                          isHighlighted ? 'bg-green-50' : ''
                        } ${option.value === value ? 'text-green-700 font-medium' : 'text-gray-900'} hover:bg-green-50`}
                      >
                        {option.value === value && (
                          <span className="absolute left-2 inline-flex items-center">
                            <CheckIcon />
                          </span>
                        )}
                        {option.label}
                      </button>
                    );
                  }}
                </List>
              ) : (
                filteredOptions.map((option, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const isDisabled = option.disabled;
                  return isDisabled ? (
                    <div
                      key={option.value}
                      className="relative flex items-center w-full px-8 py-2 text-sm rounded select-none text-left text-gray-400 cursor-not-allowed"
                      title={option.disabledReason}
                    >
                      {option.label}
                      {option.disabledReason && (
                        <span className="ml-2 text-xs text-red-400">- {option.disabledReason}</span>
                      )}
                    </div>
                  ) : (
                    <button
                      key={option.value}
                      ref={isHighlighted ? highlightedOptionRef : undefined}
                      type="button"
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`relative flex items-center w-full px-8 py-2 text-sm rounded cursor-pointer select-none text-left ${
                        isHighlighted ? 'bg-green-50' : ''
                      } ${option.value === value ? 'text-green-700 font-medium' : 'text-gray-900'} hover:bg-green-50`}
                    >
                      {option.value === value && (
                        <span className="absolute left-2 inline-flex items-center">
                          <CheckIcon />
                        </span>
                      )}
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }
);

SelectComponent.displayName = 'Select';

const Select = React.memo(SelectComponent);

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M6 1C8.76142 1 11 3.23858 11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export { Select };
export type { SelectOption, SelectOptionGroup, SelectProps };
