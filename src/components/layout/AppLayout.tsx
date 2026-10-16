'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ActiveTab } from './Navbar';
import {
  X,
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
  Camera,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeAlertsCount?: number;
  overallScore?: number;
  isSimulated?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  activeAlertsCount = 0,
  overallScore = 82.4,
  isSimulated = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const mobileNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }> = [
    { id: 'dashboard', label: 'Executive Overview', icon: Activity },
    { id: 'map', label: 'Architectural Map', icon: MapPin },
    { id: 'buildings', label: 'Building Analytics', icon: Building2 },
    { id: 'telemetry', label: 'Live Telemetry', icon: Cpu },
    { id: 'alerts', label: 'Alerts & Anomalies', icon: AlertTriangle, badgeCount: activeAlertsCount },
    { id: 'agent', label: 'EcoPilot AI', icon: Bot },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'recommendations', label: 'Action Roadmap', icon: Sparkles },
    { id: 'follow-ups', label: 'Audit Verification', icon: CheckCircle2 },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-charcoal-900 flex flex-col font-sans">
      {/* Desktop Sidebar (hidden on mobile, visible on lg and above) */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          activeAlertsCount={activeAlertsCount}
          isSimulated={isSimulated}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 p-4 shadow-elevated flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-forest-800 text-white font-bold">
                    <span className="font-mono text-xs">ET</span>
                  </div>
                  <span className="font-bold text-sm text-charcoal-900">EcoTwin AI</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-charcoal-400 hover:text-charcoal-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="pt-4 space-y-1">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-forest-50 text-forest-900 font-semibold border-l-2 border-forest-700'
                          : 'text-charcoal-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-forest-700' : 'text-charcoal-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badgeCount && item.badgeCount > 0 ? (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                          {item.badgeCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 text-[11px] text-charcoal-500">
              <span className="font-medium text-forest-800">Campus SCADA Connected</span>
              <p className="text-[10px] text-charcoal-400 mt-0.5">Sample Telemetry Stream Mode</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Body with Sidebar offset on lg screens */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Clean Sticky Header */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigateToAgent={() => onTabChange('agent')}
          overallScore={overallScore}
          isSimulated={isSimulated}
        />

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Enterprise Institutional Footer */}
        <footer className="border-t border-gray-200 bg-white py-4 px-4 sm:px-6 lg:px-8 text-xs text-charcoal-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-forest-600" />
              <span className="font-medium text-charcoal-700">EcoTwin AI Enterprise Platform</span>
              <span className="text-charcoal-300">|</span>
              <span>Engineering Hackathon Edition</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-charcoal-500">
              <span>Telemetry: <strong className="text-charcoal-700">Sample Hardware Feed</strong></span>
              <span>•</span>
              <span>Standard: <strong className="text-charcoal-700">ASHRAE 90.1 / ISO 50001</strong></span>
              <span>•</span>
              <span className="text-forest-700 font-medium">Supabase REST Configured</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
