import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface SearchableMultiSelectProps {
  label?: string;
  options: string[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  emptyMessage = "No matches found.",
  disabled = false,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const removeValue = (valToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== valToRemove));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Select all currently filtered options, or all options if filter is empty
    const toAdd = searchQuery ? filteredOptions : options;
    const newSelection = Array.from(new Set([...selectedValues, ...toAdd]));
    onChange(newSelection);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-1.5 relative w-full" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left bg-white shadow-sm font-medium border-slate-200 hover:border-slate-300 transition-colors"
      >
        <span className="truncate pr-4 text-slate-700">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            `${selectedValues.length} selected`
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 opacity-80" />
      </button>

      {/* Selected Tags Display */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 p-1 bg-slate-100/50 rounded-lg border border-slate-100 max-h-32 overflow-y-auto">
          {selectedValues.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-md shadow-sm transition-all animate-in zoom-in-95"
            >
              <span className="truncate max-w-[180px]" title={val}>{val}</span>
              <button
                type="button"
                onClick={(e) => removeValue(val, e)}
                className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-xl text-popover-foreground outline-none bg-white border-slate-200 animate-in fade-in-50 slide-in-from-top-1 duration-150 max-h-80 flex flex-col">
          {/* Search Input Area */}
          <div className="flex items-center border-b px-3 sticky top-0 bg-slate-50 rounded-t-md border-slate-100 shrink-0">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/60 border-b border-slate-100 text-[11px] font-medium text-slate-500 shrink-0 select-none">
            <button
              type="button"
              onClick={handleSelectAll}
              className="hover:text-primary hover:underline transition-all"
            >
              Select All {searchQuery && "Filtered"}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="hover:text-red-500 hover:underline transition-all"
            >
              Clear Selected
            </button>
          </div>

          {/* Options Scroll Container */}
          <div className="overflow-y-auto flex-1 p-1 max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
                      isSelected
                        ? "bg-primary/5 text-primary font-semibold"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate pr-2">{option}</span>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                      isSelected 
                        ? "bg-primary border-primary text-white" 
                        : "border-slate-300 hover:border-slate-400 bg-white"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
