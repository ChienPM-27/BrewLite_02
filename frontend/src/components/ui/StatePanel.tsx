import type { ReactNode } from 'react';

interface StatePanelProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  /** 'danger' dùng cho lỗi kết nối; 'neutral' cho rỗng / không tìm thấy. */
  tone?: 'neutral' | 'danger';
  badge?: string;
  actions?: ReactNode;
}

/** Khối trạng thái dùng chung: danh sách rỗng, không có kết quả, lỗi tải, 404. */
export default function StatePanel({
  icon,
  title,
  description,
  tone = 'neutral',
  badge,
  actions,
}: StatePanelProps) {
  const isDanger = tone === 'danger';

  return (
    <div
      role={isDanger ? 'alert' : 'status'}
      className={`mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl border px-6 py-12 text-center ${
        isDanger
          ? 'border-danger/20 bg-danger-light'
          : 'border-border-warm/70 bg-surface-milk'
      }`}
    >
      <div
        className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
          isDanger ? 'bg-danger/10 text-danger' : 'bg-primary-light text-primary'
        }`}
      >
        {icon}
      </div>
      {badge && (
        <span
          className={`mb-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
            isDanger
              ? 'border-danger/30 bg-surface-milk text-danger'
              : 'border-border-warm bg-primary-light text-primary'
          }`}
        >
          {badge}
        </span>
      )}
      <h2
        className={`text-xl font-bold ${isDanger ? 'text-danger-text' : 'text-navy'}`}
      >
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-content-secondary">
        {description}
      </p>
      {actions && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
