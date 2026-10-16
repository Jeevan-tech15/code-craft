'use client';

import React, { useState, useEffect } from 'react';
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
  Menu,
  X,
  Radio,
  Clock,
  Camera,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export type ActiveTab =
  | 'dashboard'
  | 'camera-events'
  | 'map'
  | 'buildings'
  | 'telemetry'
  | 'alerts'
  | 'agent'
  | 'inspections'
  | 'recommendations'
  | 'follow-ups'
  | 'reports';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeAlertsCount?: number;
  isSimulated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  activeAlertsCount = 2,
  isSimulated = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }> = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'camera-events', label: 'Camera Events', icon: Camera },
    { id: 'map', label: 'Campus Map', icon: MapPin },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'telemetry', label: 'Live Telemetry', icon: Cpu },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badgeCount: activeAlertsCount },
    { id: 'agent', label: 'EcoPilot AI', icon: Bot },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'recommendations', label: 'Action Track', icon: Sparkles },
    { id: 'follow-ups', label: 'Verification', icon: CheckCircle2 },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];


  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-800/80 bg-navy-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            id="brand-logo-btn"
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 via-navy-900 to-emerald-500/20 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/20 group-hover:border-cyan-400 transition-colors">
              <Activity className="h-5 w-5 text-cyan-400" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-navy-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-100">EcoTwin</span>
                <span className="rounded bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-cyan-300">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 tracking-wider">SUSTAINABLE CAMPUS TWIN</p>
            </div>
          </button>
        </div>

        {/* Center Desktop Navigation Tabs - visible on lg and above */}
        <nav className="hidden lg:flex items-center gap-1 rounded-xl border border-navy-800/70 bg-navy-900/70 p-1 overflow-x-auto max-w-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="ml-0.5 flex h-4 min-w-[15px] items-center justify-center rounded-full bg-rose-500/80 px-1 text-[10px] font-bold text-white">
                    {item.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Right Info Badges & Mobile Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Simulated / Live pill */}
          <div className="hidden sm:flex items-center gap-2">
            {isSimulated ? (
              <Badge variant="simulated" size="sm">
                SIMULATED LAB
              </Badge>
            ) : (
              <Badge variant="live" size="sm">
                LIVE SENSORS
              </Badge>
            )}

            <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono text-slate-400 pl-2 border-l border-navy-800">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Quick EcoPilot AI Shortcut */}
          <button
            id="quick-ecopilot-btn"
            onClick={() => onTabChange('agent')}
            className={`hidden md:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'agent'
                ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-sm shadow-cyan-950'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
            }`}
          >
            <Bot className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>EcoPilot</span>
          </button>

          {/* Mobile Menu Button - visible below lg */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden rounded-lg border border-navy-800 bg-navy-900/80 p-2 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-navy-800 bg-navy-950/95 px-4 pt-3 pb-5 backdrop-blur-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-navy-800/80 text-xs">
            <span className="font-semibold text-slate-400">COMMAND CENTER VIEWS</span>
            {isSimulated ? (
              <Badge variant="simulated" size="sm">
                SIMULATED TELEMETRY
              </Badge>
            ) : (
              <Badge variant="live" size="sm">
                LIVE SCADA
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-tab-${item.id}`}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-lg p-2.5 text-xs font-medium text-left transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                      : 'bg-navy-900/60 text-slate-300 border border-navy-800 hover:bg-navy-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {item.badgeCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
