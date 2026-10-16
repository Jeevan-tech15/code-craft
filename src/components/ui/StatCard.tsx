import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from './Badge';

interface DeltaProps {
  value: string;
  isPositive?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  subtext?: string;
  delta?: DeltaProps;
  changePercent?: number;
  icon: LucideIcon;
  accentColor?: 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose' | 'forest';
  isSimulated?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subValue,
  subtext,
  delta,
  changePercent,
  icon: Icon,
  accentColor = 'forest',
  isSimulated = true,
  className = '',
}) => {
  return (
    <div
      className={`card-clean p-5 flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-forest-50 text-forest-700 border border-forest-100">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-charcoal-900 font-mono">
            {value}
          </span>
          {unit && <span className="text-xs font-medium text-charcoal-500">{unit}</span>}
        </div>

        {delta && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center font-medium ${
                delta.isPositive ? 'text-forest-700' : 'text-slate-600'
              }`}
            >
              {delta.isPositive ? (
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 text-forest-600" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 text-slate-500" />
              )}
              {delta.value}
            </span>
            <span className="text-[11px] text-charcoal-400">vs baseline</span>
          </div>
        )}
      </div>

      {(subtext || subValue) && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-charcoal-500 truncate">
          {subtext || subValue}
        </div>
      )}
    </div>
  );
};
