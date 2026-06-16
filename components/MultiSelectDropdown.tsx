import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const removeOption = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== option));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`min-h-[42px] w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 flex flex-wrap gap-1.5 items-center justify-between transition-colors ${
          disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white cursor-pointer hover:border-violet-500'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1.5 items-center flex-1">
          {selectedValues.length === 0 && <span className="text-sm text-gray-500">{placeholder}</span>}
          {selectedValues.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium bg-white text-gray-800 border border-gray-300 shadow-sm"
            >
              {val}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeOption(e, val)}
                  className="text-gray-400 hover:text-red-500 rounded-full focus:outline-none ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 italic">No options available</div>
          ) : (
            options.map(option => (
              <label
                key={option}
                className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 text-violet-600 rounded border-gray-300 mr-3 focus:ring-violet-500"
                />
                {option}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};
