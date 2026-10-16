'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  Bot,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  onNavigateToAgent: () => void;
  overallScore?: number;
  isSimulated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onNavigateToAgent,
  overallScore = 82.4,
  isSimulated = true,
}) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabTitles: Record<ActiveTab, { title: string; category: string }> = {
    dashboard: { title: 'Campus Sustainability Overview', category: 'Portfolio Analytics' },
    map: { title: 'Architectural Campus Site Plan', category: 'Portfolio Analytics' },
    buildings: { title: 'Building Analytics & Submetering', category: 'Portfolio Analytics' },
    telemetry: { title: 'Real-Time Resource Telemetry', category: 'Portfolio Analytics' },
    alerts: { title: 'Operational Alerts & Anomaly Feed', category: 'Operations & Intelligence' },
    'camera-events': { title: 'Camera Waste Detections & Evidence', category: 'Operations & Intelligence' },
    agent: { title: 'EcoPilot Environmental AI Assistant', category: 'Operations & Intelligence' },
    inspections: { title: 'Physical Facility Inspections', category: 'Operations & Intelligence' },
    recommendations: { title: 'Decarbonization Action Roadmap', category: 'Action & Compliance' },
    'follow-ups': { title: 'Audit Verification & Closure', category: 'Action & Compliance' },
    reports: { title: 'Sustainability Compliance Reports', category: 'Action & Compliance' },
  };

  const current = tabTitles[activeTab] || { title: 'Dashboard', category: 'Overview' };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-charcoal-600 hover:bg-gray-100"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-charcoal-400">
            <span>EcoTwin AI</span>
            <ChevronRight className="h-3 w-3 text-charcoal-300" />
            <span>{current.category}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-charcoal-900 tracking-tight">
            {current.title}
          </h1>
        </div>
      </div>

      {/* Right: Portfolio Health Badge + Clock + EcoPilot CTA */}
      <div className="flex items-center gap-3">
        {/* Campus Efficiency Score */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-forest-50 border border-forest-200 text-xs">
          <span className="text-[10px] uppercase font-semibold text-forest-700 tracking-wider">
            Health Index
          </span>
          <span className="font-mono font-bold text-forest-800">{overallScore}%</span>
        </div>

        {/* Telemetry origin pill */}
        <div className="hidden sm:inline-flex">
          {isSimulated ? (
            <Badge variant="simulated" size="sm">
              SAMPLE LAB STREAM
            </Badge>
          ) : (
            <Badge variant="live" size="sm">
              LIVE SCADA
            </Badge>
          )}
        </div>

        {/* Clock */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-charcoal-500 pl-2 border-l border-gray-200">
          <Clock className="h-3.5 w-3.5 text-charcoal-400" />
          <span>{time}</span>
        </div>

        {/* EcoPilot Button */}
        <button
          onClick={onNavigateToAgent}
          className="inline-flex items-center gap-1.5 rounded bg-forest-800 hover:bg-forest-900 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
        >
          <Bot className="h-3.5 w-3.5 text-white" />
          <span>EcoPilot AI</span>
        </button>
      </div>
    </header>
  );
};
