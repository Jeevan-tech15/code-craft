'use client';

import React from 'react';
import {
  Activity,
  MapPin,
  Building2,
  Cpu,
  AlertTriangle,
  Bot,
  ClipboardCheck,
  Sparkles,
  CheckCircle2,
  FileText,
  Radio,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { Badge } from '@/components/ui/Badge';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeAlertsCount?: number;
  isSimulated?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeAlertsCount = 0,
  isSimulated = true,
  collapsed = false,
  onToggleCollapse,
}) => {
  const navSections: Array<{
    title: string;
    items: Array<{
      id: ActiveTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badgeCount?: number;
    }>;
  }> = [
    {
      title: 'PORTFOLIO ANALYTICS',
      items: [
        { id: 'dashboard', label: 'Executive Overview', icon: Activity },
        { id: 'map', label: 'Architectural Map', icon: MapPin },
        { id: 'buildings', label: 'Building Analytics', icon: Building2 },
        { id: 'telemetry', label: 'Live Telemetry', icon: Cpu },
      ],
    },
    {
      title: 'OPERATIONS & INTELLIGENCE',
      items: [
        { id: 'camera-events', label: 'Camera Events', icon: Camera },
        { id: 'alerts', label: 'Alerts & Anomalies', icon: AlertTriangle, badgeCount: activeAlertsCount },
        { id: 'agent', label: 'EcoPilot AI Assistant', icon: Bot },
        { id: 'inspections', label: 'Physical Inspections', icon: ClipboardCheck },
      ],
    },
    {
      title: 'ACTION & COMPLIANCE',
      items: [
        { id: 'recommendations', label: 'Decarbonization Plan', icon: Sparkles },
        { id: 'follow-ups', label: 'Audit Verification', icon: CheckCircle2 },
        { id: 'reports', label: 'Reports & Export', icon: FileText },
      ],
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <button
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded bg-forest-800 text-white font-bold shadow-xs">
            <span className="font-mono text-sm tracking-tighter">ET</span>
          </div>
          {!collapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-charcoal-900 text-sm">EcoTwin AI</span>
                <span className="rounded bg-forest-50 border border-forest-200 px-1 py-0.2 text-[9px] font-semibold text-forest-800">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-charcoal-500 font-medium tracking-wide">CAMPUS SUSTAINABILITY</p>
            </div>
          )}
        </button>

        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="rounded p-1 text-charcoal-400 hover:bg-gray-100 hover:text-charcoal-700"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <span className="block px-2 text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider mb-1.5">
                {sec.title}
              </span>
            )}
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-forest-50 text-forest-900 font-semibold border-l-2 border-forest-700 shadow-subtle'
                        : 'text-charcoal-600 hover:bg-gray-50 hover:text-charcoal-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 ${
                          isActive ? 'text-forest-700' : 'text-charcoal-400'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && item.badgeCount && item.badgeCount > 0 ? (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {item.badgeCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Telemetry Status Strip */}
      <div className="border-t border-gray-200 p-3 bg-gray-50/80">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-charcoal-500 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                SCADA Gateway
              </span>
              <span className="font-mono text-[10px] text-charcoal-600 font-semibold">Online</span>
            </div>
            <div className="text-[10px] text-charcoal-400 border-t border-gray-200 pt-1.5 flex items-center justify-between">
              <span>{isSimulated ? 'Sample Lab Feed' : 'Live Gateway'}</span>
              <span className="text-forest-700 font-medium">ASHRAE 90.1</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="SCADA Core Online">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
