'use client';

import { CategoryTab } from '@/hooks/useProductCatalog';

interface CategoryTabsProps {
  categories: CategoryTab[];
  selected: string;
  onSelect: (category: string) => void;
  disabled?: boolean;
}

/** Thanh tab danh mục dạng pill, tự sinh từ dữ liệu sản phẩm (BR-CAT-04). */
export default function CategoryTabs({
  categories,
  selected,
  onSelect,
  disabled = false,
}: CategoryTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Danh mục đồ uống"
      className="no-scrollbar flex select-none items-center gap-2 overflow-x-auto py-1"
    >
      {categories.map((category) => {
        const active = category.name === selected;
        return (
          <button
            key={category.name}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onSelect(category.name)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? 'border border-primary bg-primary text-surface-milk shadow-card-hover'
                : 'border border-border-warm/60 bg-surface-milk text-content-roast shadow-card hover:text-navy'
            }`}
          >
            <span>{category.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                active ? 'bg-surface-milk/20' : 'bg-surface-sand'
              }`}
            >
              {category.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
