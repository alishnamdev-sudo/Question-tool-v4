import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

interface SearchableSelectProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  emptyMessage = "No matches found.",
  disabled = false,
}: SearchableSelectProps) {
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

  return (
    <div className="space-y-1 relative w-full" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left bg-white shadow-sm font-medium border-slate-200 hover:border-slate-300 transition-colors"
      >
        <span className="truncate">
          {value || <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 opacity-80" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-xl text-popover-foreground outline-none bg-white border-slate-200 animate-in fade-in-50 slide-in-from-top-1 duration-150 max-h-72 flex flex-col">
          {/* Search Input Area */}
          <div className="flex items-center border-b px-3 sticky top-0 bg-slate-50 rounded-t-md border-slate-100 shrink-0">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search option..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Options Scroll Container */}
          <div className="overflow-y-auto flex-1 max-h-52 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {isSelected && <Check className="h-4 w-4 animate-scaleIn shrink-0 text-primary" />}
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
