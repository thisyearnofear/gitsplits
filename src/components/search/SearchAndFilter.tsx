"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptySearch } from "@/components/empty-states/EmptyState";

// Types
export interface FilterOption {
  id: string;
  label: string;
  type: "select" | "range" | "date" | "boolean";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface FilterState {
  [key: string]: string | number | boolean | Date | undefined;
}

export interface SearchableItem {
  id: string;
  [key: string]: unknown;
}

interface SearchAndFilterProps<T extends SearchableItem> {
  items: T[];
  searchFields: (keyof T)[];
  filterOptions: FilterOption[];
  renderItem: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

// Search highlight component
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Main Search and Filter Component
export function SearchAndFilter<T extends SearchableItem>({
  items,
  searchFields,
  filterOptions,
  renderItem,
  emptyState,
  placeholder = "Search...",
  className = "",
}: SearchAndFilterProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");

  // Apply search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === "number") {
          return value.toString().includes(query);
        }
        return false;
      })
    );
  }, [items, searchQuery, searchFields]);

  // Apply filters
  const filteredResults = useMemo(() => {
    return searchResults.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === "" || value === false) return true;
        
        const itemValue = item[key];
        
        if (typeof value === "boolean") {
          return itemValue === value;
        }
        
        if (typeof value === "number") {
          const numValue = Number(itemValue);
          return !isNaN(numValue) && numValue >= value;
        }
        
        if (value instanceof Date) {
          const itemDate = new Date(itemValue as string);
          return itemDate >= value;
        }
        
        return String(itemValue).toLowerCase() === String(value).toLowerCase();
      });
    });
  }, [searchResults, filters]);

  // Apply sorting
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => 
          new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
        );
      case "oldest":
        return sorted.sort((a, b) => 
          new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime()
        );
      case "amount-high":
        return sorted.sort((a, b) => (b.amount as number) - (a.amount as number));
      case "amount-low":
        return sorted.sort((a, b) => (a.amount as number) - (b.amount as number));
      case "name-asc":
        return sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      case "name-desc":
        return sorted.sort((a, b) => String(b.name).localeCompare(String(a.name)));
      default:
        return sorted;
    }
  }, [filteredResults, sortBy]);

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && v !== false
  ).length;

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery("");
  }, []);

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  return (
    <div className={className}>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filterOptions.map((option) => (
              <div key={option.id} className="px-2 py-2">
                <p className="text-sm font-medium mb-2">{option.label}</p>
                {option.type === "select" && option.options && (
                  <div className="space-y-1">
                    {option.options.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => updateFilter(option.id, opt.value)}
                        className={filters[option.id] === opt.value ? "bg-accent" : ""}
                      >
                        {opt.label}
                        {filters[option.id] === opt.value && (
                          <span className="ml-auto text-blue-600">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {option.type === "range" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="w-20"
                      value={filters[option.id] || ""}
                      onChange={(e) => updateFilter(option.id, Number(e.target.value))}
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      className="w-20"
                      value={filters[`${option.id}Max`] || ""}
                      onChange={(e) => updateFilter(`${option.id}Max`, Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            ))}
            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters} className="text-red-600">
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Sort
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy("newest")}>
              Newest first
              {sortBy === "newest" && <span className="ml-auto text-blue-600">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("oldest")}>
              Oldest first
              {sortBy === "oldest" && <span className="ml-auto text-blue-600">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortBy("amount-high")}>
              Amount: High to Low
              {sortBy === "amount-high" && <span className="ml-auto text-blue-600">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("amount-low")}>
              Amount: Low to High
              {sortBy === "amount-low" && <span className="ml-auto text-blue-600">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortBy("name-asc")}>
              Name: A to Z
              {sortBy === "name-asc" && <span className="ml-auto text-blue-600">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("name-desc")}>
              Name: Z to A
              {sortBy === "name-desc" && <span className="ml-auto text-blue-600">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {Object.entries(filters).map(([key, value]) => {
            if (value === undefined || value === "" || value === false) return null;
            const option = filterOptions.find((o) => o.id === key);
            const label = option?.options?.find((o) => o.value === value)?.label || String(value);
            
            return (
              <Badge
                key={key}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {option?.label}: {label}
                <button
                  onClick={() => removeFilter(key)}
                  className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600 h-7">
            Clear all
          </Button>
        </motion.div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {sortedResults.length} result{sortedResults.length !== 1 ? "s" : ""}
          {(searchQuery || activeFiltersCount > 0) && " found"}
        </p>
      </div>

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {sortedResults.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {sortedResults.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                {renderItem(item)}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {emptyState || <EmptySearch onClear={clearFilters} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Preset filter configurations for common use cases
export const splitFilters: FilterOption[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
    ],
  },
  {
    id: "amount",
    label: "Amount",
    type: "range",
    min: 0,
  },
  {
    id: "contributors",
    label: "Contributors",
    type: "range",
    min: 1,
  },
];

export const contributorFilters: FilterOption[] = [
  {
    id: "verified",
    label: "Verification Status",
    type: "select",
    options: [
      { value: "verified", label: "Verified" },
      { value: "pending", label: "Pending" },
      { value: "unverified", label: "Unverified" },
    ],
  },
  {
    id: "earnings",
    label: "Total Earnings",
    type: "range",
    min: 0,
  },
];

export default SearchAndFilter;
