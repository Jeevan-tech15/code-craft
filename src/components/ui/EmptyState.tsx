import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-slate-800/80 bg-slate-900/30 ${className}`}
    >
      <div className="rounded-full bg-slate-800/60 p-3.5 text-slate-400 border border-slate-700/60">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3.5 text-base font-semibold text-slate-200">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-slate-400 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
