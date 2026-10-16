import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'System Telemetry Notice',
  message,
  code,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`rounded-lg border border-rose-200 bg-rose-50/90 p-4 text-rose-900 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="rounded bg-rose-100 p-1.5 text-rose-700 shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">{title}</h4>
            {code && (
              <span className="font-mono text-[10px] text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                {code}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-rose-800 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-900 hover:bg-rose-50 shadow-xs transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-rose-600" />
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
