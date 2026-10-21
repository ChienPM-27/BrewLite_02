'use client';

import { Search, X } from 'lucide-react';

interface ProductSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Ô tìm kiếm thời gian thực (lọc client-side, hỗ trợ tiếng Việt không dấu). */
export default function ProductSearchBar({
  value,
  onChange,
  disabled = false,
}: ProductSearchBarProps) {
  return (
    <div className="relative flex w-full max-w-2xl items-center rounded-full border-[1.5px] border-border-warm bg-surface-milk shadow-card transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light">
      <Search className="ml-4 h-5 w-5 shrink-0 text-content-secondary" aria-hidden="true" />
      <input
        id="menu-search"
        type="search"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm món... (hỗ trợ không dấu)"
        aria-label="Tìm món trong thực đơn"
        autoComplete="off"
        className="w-full bg-transparent py-3 pl-2 pr-12 text-sm text-content-primary outline-none placeholder:text-[#A89C94] disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Xóa nội dung tìm kiếm"
          className="absolute right-3 rounded-full p-1 text-outline transition-colors hover:bg-surface-container hover:text-navy"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
