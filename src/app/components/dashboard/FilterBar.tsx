import { Search, Filter, Download, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onExport?: () => void;
  onSearch?: (query: string) => void;
}

export function FilterBar({ 
  searchPlaceholder = 'Search...', 
  filters = [],
  onExport,
  onSearch 
}: FilterBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>
        
        {/* Filters */}
        {filters.map((filter) => (
          <Select key={filter.value} value={filter.label} />
        ))}
        
        {/* Actions */}
        <Button variant="secondary" icon={<SlidersHorizontal className="w-4 h-4" />}>
          Filters
        </Button>
        
        {onExport && (
          <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={onExport}>
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
