import React from 'react';
import { AlertSeverity, AlertStatus } from '@/types';

export type BadgeVariant =
  | 'severity'
  | 'status'
  | 'category'
  | 'simulated'
  | 'live'
  | 'pill'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'normal'
  | 'warning'
  | 'active'
  | 'investigating'
  | 'resolved'
  | 'follow_up_scheduled'
  | 'todo'
  | 'in_progress'
  | 'verified'
  | 'completed'
  | 'online'
  | 'degraded'
  | 'offline'
  | string;

interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  severity?: AlertSeverity;
  status?: AlertStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'pill',
  severity,
  status,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs font-medium';
  const normalized = (variant || '').toLowerCase();

  // Simulated Telemetry Pill
  if (normalized === 'simulated') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-gray-300 bg-gray-100/80 text-charcoal-700 font-mono ${sizeClasses} ${className}`}
        title="Simulated sensor feed"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        {children || 'SIMULATED DATA'}
      </span>
    );
  }

  // Live SCADA Sensor Pill
  if (normalized === 'live') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-forest-200 bg-forest-50 text-forest-800 font-mono ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-forest-600 animate-pulse" />
        {children || 'LIVE SCADA'}
      </span>
    );
  }

  // Critical Severity / Alarm
  if (normalized === 'critical' || severity === 'critical') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 font-semibold uppercase tracking-wider ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {children || 'CRITICAL'}
      </span>
    );
  }

  // High Severity
  if (normalized === 'high' || severity === 'high') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-orange-200 bg-orange-50 text-orange-800 font-semibold uppercase tracking-wider ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        {children || 'HIGH'}
      </span>
    );
  }

  // Medium / Warning / Degraded
  if (normalized === 'warning' || normalized === 'medium' || normalized === 'degraded' || severity === 'medium') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 text-amber-800 font-semibold uppercase tracking-wider ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {children || (normalized === 'degraded' ? 'DEGRADED' : 'WARNING')}
      </span>
    );
  }

  // Normal / Online / Resolved / Low
  if (
    normalized === 'normal' ||
    normalized === 'online' ||
    normalized === 'resolved' ||
    normalized === 'completed' ||
    normalized === 'verified' ||
    normalized === 'low' ||
    severity === 'low' ||
    status === 'resolved'
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold uppercase tracking-wider ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        {children || (normalized === 'online' ? 'ONLINE' : 'NORMAL')}
      </span>
    );
  }

  // Active / Investigating / In Progress
  if (
    normalized === 'active' ||
    normalized === 'investigating' ||
    normalized === 'in_progress' ||
    normalized === 'follow_up_scheduled' ||
    status === 'active' ||
    status === 'investigating'
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-100 text-slate-800 font-semibold uppercase tracking-wider ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        {children || normalized.replace('_', ' ')}
      </span>
    );
  }

  // Offline
  if (normalized === 'offline') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-100 text-gray-500 font-semibold uppercase tracking-wider ${sizeClasses} ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        {children || 'OFFLINE'}
      </span>
    );
  }

  // Default clean neutral pill
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 text-charcoal-700 font-medium ${sizeClasses} ${className}`}
    >
      {children || variant}
    </span>
  );
};
