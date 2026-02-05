'use client';

import { useState, useEffect, useRef } from 'react';
import { generateUniqueId } from '@/app/lib/datetime';

export interface SmartNote {
  id: string;
  text: string;
  category: 'mtc' | 'testing' | 'inspection' | 'ndt' | 'custom';
  usageCount?: number;
  isCustom?: boolean;
}

const DEFAULT_NOTES: SmartNote[] = [
  { id: 'mtc-1', text: 'Provide material test certificates (MTC) for this item.', category: 'mtc' },
  { id: 'mtc-2', text: 'Ensure full traceability with heat numbers and markings.', category: 'mtc' },
  { id: 'testing-1', text: 'Perform hydrostatic pressure testing and provide results.', category: 'testing' },
  { id: 'inspection-1', text: 'Verify dimensions against provided drawings or specifications.', category: 'inspection' },
  { id: 'inspection-2', text: 'Measure outer diameter (OD), inner diameter (ID), and wall thickness.', category: 'inspection' },
  { id: 'inspection-3', text: 'Check for pipe straightness, roundness, and ovality.', category: 'inspection' },
  { id: 'ndt-1', text: 'Conduct non-destructive testing (NDT) on all welds.', category: 'ndt' },
  { id: 'ndt-2', text: 'Perform ultrasonic testing (UT) on welds.', category: 'ndt' },
  { id: 'ndt-3', text: 'Conduct radiographic testing (RT) on welds.', category: 'ndt' },
  { id: 'ndt-4', text: 'Conduct dye penetrant testing (PT) on welds.', category: 'ndt' },
  { id: 'ndt-5', text: 'Conduct magnetic particle testing (MT) on welds.', category: 'ndt' },
  { id: 'ndt-6', text: 'Perform hardness testing on weld zones.', category: 'ndt' },
  { id: 'inspection-4', text: 'Inspect welds for penetration, concavity, undercut, and Hi-Lo misalignment.', category: 'inspection' },
];

const CATEGORY_LABELS: Record<string, string> = {
  mtc: 'Material & Traceability',
  testing: 'Pressure Testing',
  inspection: 'Dimensional Inspection',
  ndt: 'Non-Destructive Testing',
  custom: 'Custom Notes',
};

const CATEGORY_COLORS: Record<string, string> = {
  mtc: 'bg-blue-100 text-blue-800 border-blue-200',
  testing: 'bg-green-100 text-green-800 border-green-200',
  inspection: 'bg-amber-100 text-amber-800 border-amber-200',
  ndt: 'bg-purple-100 text-purple-800 border-purple-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
};

interface SmartNotesDropdownProps {
  selectedNotes: string[];
  onNotesChange: (notes: string[]) => void;
  placeholder?: string;
}

export function SmartNotesDropdown({
  selectedNotes,
  onNotesChange,
  placeholder = 'Select or add notes...',
}: SmartNotesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [availableNotes, setAvailableNotes] = useState<SmartNote[]>(DEFAULT_NOTES);
  const [customNotes, setCustomNotes] = useState<SmartNote[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedCustomNotes = localStorage.getItem('smartNotes_custom');
    if (storedCustomNotes) {
      try {
        const parsed = JSON.parse(storedCustomNotes) as SmartNote[];
        setCustomNotes(parsed);
      } catch {
        console.warn('Failed to parse stored custom notes');
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allNotes = [...availableNotes, ...customNotes];

  function toggleNote(noteText: string) {
    if (selectedNotes.includes(noteText)) {
      onNotesChange(selectedNotes.filter(n => n !== noteText));
    } else {
      onNotesChange([...selectedNotes, noteText]);
    }
  }

  function addCustomNote() {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (!allNotes.some(n => n.text.toLowerCase() === trimmed.toLowerCase())) {
      const newNote: SmartNote = {
        id: `custom-${generateUniqueId()}`,
        text: trimmed,
        category: 'custom',
        isCustom: true,
        usageCount: 1,
      };

      const updatedCustomNotes = [...customNotes, newNote];
      setCustomNotes(updatedCustomNotes);

      localStorage.setItem('smartNotes_custom', JSON.stringify(updatedCustomNotes));

      onNotesChange([...selectedNotes, trimmed]);
    } else if (!selectedNotes.includes(trimmed)) {
      onNotesChange([...selectedNotes, trimmed]);
    }

    setCustomInput('');
  }

  function removeNote(noteText: string) {
    onNotesChange(selectedNotes.filter(n => n !== noteText));
  }

  function noteCategory(noteText: string): string {
    const note = allNotes.find(n => n.text === noteText);
    return note?.category || 'custom';
  }

  const groupedNotes = allNotes.reduce((acc, note) => {
    if (!acc[note.category]) {
      acc[note.category] = [];
    }
    acc[note.category].push(note);
    return acc;
  }, {} as Record<string, SmartNote[]>);

  return (
    <div className="space-y-2">
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 hover:border-green-400 transition-colors"
        >
          <span className="text-gray-500">{placeholder}</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomNote();
                    }
                  }}
                  placeholder="Type custom note and press Enter..."
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={addCustomNote}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                Custom notes are saved and will appear in future sessions
              </p>
            </div>

            {Object.entries(groupedNotes).map(([category, notes]) => (
              <div key={category} className="border-b border-gray-100 last:border-b-0">
                <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600">
                  {CATEGORY_LABELS[category] || category}
                </div>
                {notes.map((note) => {
                  const isSelected = selectedNotes.includes(note.text);
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => toggleNote(note.text)}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors flex items-start gap-2 ${
                        isSelected ? 'bg-green-50' : ''
                      }`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className="text-gray-700">{note.text}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedNotes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600">Selected Notes ({selectedNotes.length}):</p>
          <div className="flex flex-wrap gap-1">
            {selectedNotes.map((note, index) => {
              const category = noteCategory(note);
              return (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${CATEGORY_COLORS[category]}`}
                >
                  <span className="max-w-[200px] truncate">{note}</span>
                  <button
                    type="button"
                    onClick={() => removeNote(note)}
                    className="hover:text-red-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function formatNotesForDisplay(notes: string[]): string {
  if (!notes || notes.length === 0) return '';
  return notes.map((note, i) => `${i + 1}. ${note}`).join('\n');
}

export { DEFAULT_NOTES };
