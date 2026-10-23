'use client';

import { Search, X } from 'lucide-react';

interface ProductSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const QUICK_SUGGESTIONS = ['Cà phê sữa', 'Trà đào', 'Bạc xỉu', 'Cold brew'];

/** Ô tìm kiếm thời gian thực (lọc client-side, hỗ trợ tiếng Việt không dấu) kèm gợi ý nhanh. */
export default function ProductSearchBar({
  value,
  onChange,
  disabled = false,
}: ProductSearchBarProps) {
  return (
    <div className="flex flex-col gap-2.5">
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
          className="w-full bg-transparent py-3 pl-2 pr-12 text-sm text-navy outline-none placeholder:text-[#A89C94] disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Xóa nội dung tìm kiếm"
            className="absolute right-3 rounded-full p-1 text-content-secondary transition-colors hover:bg-surface-sand hover:text-navy"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Gợi ý nhanh */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-content-secondary">
        <span className="font-semibold text-content-roast">Gợi ý nhanh:</span>
        {QUICK_SUGGESTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tag)}
            className={`rounded-full border border-border-warm bg-surface-milk px-3 py-1 font-medium transition-all hover:border-primary hover:text-primary active:scale-95 disabled:pointer-events-none ${
              value === tag ? 'border-primary bg-primary text-white shadow-card' : ''
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
