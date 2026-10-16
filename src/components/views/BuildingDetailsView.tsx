'use client';

import React, { useState } from 'react';
import { Building, BuildingId, Alert } from '@/types';
import { Badge } from '@/components/ui/Badge';
import {
  Building2,
  Zap,
  Droplet,
  Trash2,
  Leaf,
  AlertTriangle,
  Bot,
  Activity,
  Calendar,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface BuildingDetailsViewProps {
  buildings: Building[];
  selectedBuildingId: BuildingId;
  alerts: Alert[];
  onSelectBuilding: (id: BuildingId) => void;
  onInvestigateAlert: (alertId: string, buildingId: BuildingId) => void;
  onScheduleFollowUp: (alertId?: string, buildingId?: BuildingId) => void;
  onAskEcoPilotAboutBuilding: (buildingId: BuildingId) => void;
}

export function BuildingDetailsView({
  buildings,
  selectedBuildingId,
  alerts,
  onSelectBuilding,
  onInvestigateAlert,
  onScheduleFollowUp,
  onAskEcoPilotAboutBuilding,
}: BuildingDetailsViewProps) {
  const [activeMetricTab, setActiveMetricTab] = useState<'electricity' | 'water' | 'waste' | 'carbon'>('electricity');

  const currentBuilding = buildings.find((b) => b.id === selectedBuildingId) || buildings[0];
  const buildingAlerts = alerts.filter((a) => a.buildingId === currentBuilding.id);

  // Transform historical trends for Recharts
  const trendData = currentBuilding.historicalTrend.map((t) => ({
    time: t.timestamp,
    electricity: t.electricity,
    water: t.water,
    waste: t.waste,
    carbon: t.carbon,
  }));

  const metricColors = {
    electricity: '#164E3D',
    water: '#0369A1',
    waste: '#6B21A8',
    carbon: '#334155',
  };

  return (
    <div className="space-y-6">
      {/* Facility Switcher Tabs */}
      <div className="card-clean p-1.5 flex flex-wrap items-center gap-2">
        {buildings.map((b) => {
          const isSelected = b.id === currentBuilding.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelectBuilding(b.id)}
              className={`flex-1 min-w-[200px] flex items-center justify-between px-3.5 py-2.5 rounded text-left transition-all ${
                isSelected
                  ? 'bg-forest-50 border border-forest-600 text-forest-900 shadow-xs'
                  : 'bg-white hover:bg-gray-50 border border-gray-200 text-charcoal-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs ${
                    isSelected ? 'bg-forest-800 text-white' : 'bg-gray-100 text-charcoal-500'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-forest-900' : 'text-charcoal-900'}`}>
                    {b.name}
                  </div>
                  <div className="text-[10px] text-charcoal-400 font-mono">{b.code}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold font-mono text-charcoal-900">
                  {b.efficiencyScore}%
                </span>
                <span className="block text-[10px] text-charcoal-400">
                  {b.activeAlertsCount} {b.activeAlertsCount === 1 ? 'Issue' : 'Issues'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Building Header Profile Card */}
      <div className="card-clean p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">{currentBuilding.name}</h2>
              <Badge variant={currentBuilding.status}>{currentBuilding.status}</Badge>
              <Badge variant="simulated">Submetered SCADA Array</Badge>
            </div>
            <p className="text-xs text-forest-800 font-semibold">{currentBuilding.tagline}</p>
            <p className="text-xs text-charcoal-600 max-w-3xl leading-relaxed mt-1">
              {currentBuilding.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              onClick={() => onAskEcoPilotAboutBuilding(currentBuilding.id)}
              className="px-3.5 py-2 rounded bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              <Bot className="h-4 w-4" />
              Ask EcoPilot to Audit Facility
            </button>
          </div>
        </div>

        {/* Building Operational Specification Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Gross Floor Area</span>
            <div className="text-sm font-bold font-mono text-charcoal-900 mt-1">
              {currentBuilding.areaSqFt.toLocaleString()} sq ft
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Occupancy Load</span>
            <div className="text-sm font-bold font-mono text-charcoal-900 mt-1">
              {currentBuilding.occupancy.current} / {currentBuilding.occupancy.capacity}
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Electricity Draw</span>
            <div className="text-sm font-bold font-mono text-forest-800 mt-1">
              {currentBuilding.resources.electricityKwh} kWh
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Solar Generation</span>
            <div className="text-sm font-bold font-mono text-emerald-700 mt-1">
              {currentBuilding.resources.solarGenerationKwh} kWh
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Water Draw</span>
            <div className="text-sm font-bold font-mono text-charcoal-900 mt-1">
              {currentBuilding.resources.waterLiters.toLocaleString()} L
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Health Index</span>
            <div className="text-sm font-bold font-mono text-forest-800 mt-1">
              {currentBuilding.efficiencyScore} / 100
            </div>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Profile */}
      <div className="card-clean p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-3">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-forest-700" />
              24-Hour Telemetry Profiles & Anomaly Baselines
            </h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Submeter telemetry recorded across building automation zones every 4 hours.
            </p>
          </div>

          <div className="flex bg-gray-100 rounded-md p-1 border border-gray-200 self-start sm:self-auto text-xs">
            {(['electricity', 'water', 'waste', 'carbon'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setActiveMetricTab(metric)}
                className={`px-3 py-1 font-medium rounded capitalize transition-all ${
                  activeMetricTab === metric
                    ? 'bg-white text-forest-800 font-semibold shadow-xs border border-gray-200'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-72 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="metricFillColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricColors[activeMetricTab]} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={metricColors[activeMetricTab]} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                unit={
                  activeMetricTab === 'electricity'
                    ? ' kWh'
                    : activeMetricTab === 'water'
                    ? ' L'
                    : activeMetricTab === 'waste'
                    ? ' kg'
                    : ' t'
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#111827',
                }}
              />
              <Area
                type="monotone"
                dataKey={activeMetricTab}
                name={`${activeMetricTab.toUpperCase()}`}
                stroke={metricColors[activeMetricTab]}
                fillOpacity={1}
                fill="url(#metricFillColor)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomalies with Baseline Deviations & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Detected Anomalies */}
        <div className="lg:col-span-7 card-clean p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-charcoal-900">
                Detected Telemetry Anomalies ({currentBuilding.anomalies.length})
              </h3>
            </div>
            <span className="text-xs text-charcoal-500 font-mono">SCADA Baseline Engine</span>
          </div>

          {currentBuilding.anomalies.length === 0 ? (
            <div className="py-8 text-center text-xs text-charcoal-500">
              No anomalies detected for this facility. Operating within nominal green boundaries.
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {currentBuilding.anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={anom.severity}>{anom.severity}</Badge>
                        <span className="text-xs font-mono font-bold text-charcoal-800">{anom.equipmentId}</span>
                        <span className="text-[11px] text-charcoal-400">• {anom.timestamp}</span>
                      </div>
                      <h4 className="text-xs font-bold text-charcoal-900 mt-1">{anom.title}</h4>
                      <p className="text-xs text-charcoal-600 mt-0.5">{anom.description}</p>
                    </div>
                  </div>

                  {/* Evidence vs Baseline Comparison Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded bg-white border border-gray-200 text-xs">
                    <div>
                      <span className="text-[10px] text-rose-700 font-bold uppercase block">Measured Telemetry</span>
                      <span className="font-mono text-charcoal-900 font-bold">{anom.evidenceValue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-forest-800 font-bold uppercase block">Nominal Target</span>
                      <span className="font-mono text-charcoal-900">{anom.baselineValue}</span>
                    </div>
                  </div>

                  <div className="text-xs text-charcoal-700 bg-white p-2.5 rounded border border-gray-200">
                    <span className="font-semibold text-charcoal-900">Potential Root Cause: </span>
                    {anom.possibleCause}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Building Active Alerts & Actions */}
        <div className="lg:col-span-5 card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Active Alerts ({buildingAlerts.length})
              </h3>
              <span className="text-xs text-charcoal-500 font-mono">{currentBuilding.code}</span>
            </div>

            <div className="space-y-3 mt-4">
              {buildingAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity}>{alert.severity}</Badge>
                        <Badge variant={alert.status}>{alert.status.replace('_', ' ')}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-charcoal-900 mt-1.5">{alert.title}</h4>
                      <p className="text-[11px] text-charcoal-600 line-clamp-2 mt-0.5">{alert.description}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onScheduleFollowUp(alert.id, alert.buildingId)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 text-charcoal-700 text-[11px] font-medium border border-gray-300 shadow-xs"
                    >
                      Record Follow-up
                    </button>
                    <button
                      onClick={() => onInvestigateAlert(alert.id, alert.buildingId)}
                      className="px-2.5 py-1 rounded bg-forest-800 hover:bg-forest-900 text-white text-[11px] font-medium flex items-center gap-1 shadow-xs"
                    >
                      <Bot className="h-3 w-3 text-white" />
                      Investigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-charcoal-500 flex items-center justify-between">
            <span>Resolving an alert requires logged audit verification</span>
            <button
              onClick={() => onScheduleFollowUp(undefined, currentBuilding.id)}
              className="text-forest-700 hover:text-forest-800 font-semibold"
            >
              Log Verification →
            </button>
          </div>
        </div>
      </div>

      {/* Connected IoT Sensors & Meters */}
      <div className="card-clean p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-forest-700" />
              Connected IoT Sensors & SCADA Metering Nodes
            </h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Live telemetry stream nodes deployed across {currentBuilding.name} zone controllers.
            </p>
          </div>
          <Badge variant="simulated">Sample Sensor Array</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {currentBuilding.sensors.map((sensor) => (
            <div
              key={sensor.id}
              className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-charcoal-500 font-bold">{sensor.id}</span>
                  <Badge variant={sensor.status}>{sensor.status}</Badge>
                </div>
                <h4 className="text-xs font-bold text-charcoal-900 mt-1">{sensor.name}</h4>
                <div className="text-[10px] text-charcoal-500 capitalize">{sensor.type.replace('_', ' ')}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200 flex items-baseline justify-between">
                <span className="text-base font-bold text-charcoal-900 font-mono">
                  {sensor.value} <span className="text-xs font-normal text-charcoal-500">{sensor.unit}</span>
                </span>
                <span className="text-[10px] text-charcoal-400 font-mono">{sensor.lastReadingTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
