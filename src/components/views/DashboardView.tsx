'use client';

import React from 'react';
import { CampusOverview, Building, Alert, BuildingId } from '@/types';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import {
  Zap,
  Droplet,
  Trash2,
  Leaf,
  AlertTriangle,
  ArrowRight,
  Sun,
  ShieldAlert,
  Bot,
  Activity,
  Layers,
  ChevronRight,
  TrendingDown,
  Building2,
  Camera,
  Radio,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { CameraEvent } from '@/types';
import { apiClient } from '@/lib/api-client';
import { getSupabase } from '@/lib/supabase';
import { EventDetailDrawer } from '@/components/views/EventDetailDrawer';
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

interface DashboardViewProps {
  overview: CampusOverview;
  buildings: Building[];
  alerts: Alert[];
  onSelectBuilding: (id: BuildingId) => void;
  onNavigateToTab: (tab: string) => void;
  onInvestigateAlert: (alertId: string, buildingId: BuildingId) => void;
  onInvestigateCameraEvent?: (event: CameraEvent) => void;
}

export function DashboardView({
  overview,
  buildings,
  alerts,
  onSelectBuilding,
  onNavigateToTab,
  onInvestigateAlert,
  onInvestigateCameraEvent,
}: DashboardViewProps) {
  // Live camera events state
  const [cameraEvents, setCameraEvents] = React.useState<CameraEvent[]>([]);
  const [isLoadingCamera, setIsLoadingCamera] = React.useState(true);
  const [realtimeActive, setRealtimeActive] = React.useState(false);
  const [selectedDrawerEvent, setSelectedDrawerEvent] = React.useState<CameraEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const loadCameraEvents = React.useCallback(async () => {
    try {
      const res = await apiClient.getCameraEvents({ limit: 4 });
      if (res.data) {
        setCameraEvents(res.data);
      }
    } catch (e) {
      console.warn('Dashboard camera event load error:', e);
    } finally {
      setIsLoadingCamera(false);
    }
  }, []);

  React.useEffect(() => {
    loadCameraEvents();

    let channel: any = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel('dashboard_camera_events_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_events' }, () => {
          loadCameraEvents();
        })
        .subscribe((status: string) => {
          setRealtimeActive(status === 'SUBSCRIBED');
        });
    } catch (_) {
      setRealtimeActive(false);
    }

    const interval = setInterval(() => {
      loadCameraEvents();
    }, 10000);

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (_) {}
      }
    };
  }, [loadCameraEvents]);

  const handleUpdateStatus = async (
    eventId: string,
    newStatus: 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved',
    notes?: string
  ) => {
    await apiClient.updateEventReviewStatus(eventId, newStatus, notes);
    await loadCameraEvents();
  };
  // 24h hourly energy & water telemetry profile
  const hourlyData = [
    { hour: '00:00', grid: 120, solar: 0, water: 820, carbon: 0.12 },
    { hour: '02:00', grid: 110, solar: 0, water: 710, carbon: 0.11 },
    { hour: '04:00', grid: 180, solar: 0, water: 890, carbon: 0.18 }, // HVAC off-cycle spike
    { hour: '06:00', grid: 195, solar: 15, water: 1650, carbon: 0.20 },
    { hour: '08:00', grid: 340, solar: 120, water: 3400, carbon: 0.35 },
    { hour: '10:00', grid: 410, solar: 240, water: 4800, carbon: 0.42 },
    { hour: '12:00', grid: 480, solar: 320, water: 6200, carbon: 0.49 }, // Peak solar
    { hour: '14:00', grid: 460, solar: 300, water: 5700, carbon: 0.47 },
    { hour: '16:00', grid: 390, solar: 180, water: 4900, carbon: 0.40 },
    { hour: '18:00', grid: 280, solar: 40, water: 3800, carbon: 0.29 },
    { hour: '20:00', grid: 210, solar: 0, water: 2400, carbon: 0.22 },
    { hour: '22:00', grid: 160, solar: 0, water: 1300, carbon: 0.16 },
  ];

  const buildingComparisonData = buildings.map((b) => ({
    name: b.name.replace(' Block', '').replace(' Central', ''),
    demand: Math.round(b.resources.electricityKwh),
    solar: Math.round(b.resources.solarGenerationKwh),
    water: Math.round(b.resources.waterLiters / 10),
    score: b.efficiencyScore,
  }));

  const highPriorityAlerts = alerts
    .filter((a) => (a.severity === 'critical' || a.severity === 'high') && (a.status === 'active' || a.status === 'investigating'))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Simulation / Data Stream Sub-Header Notice */}
      <div className="card-clean p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white">
        <div className="flex items-center gap-2.5">
          <Badge variant="simulated">Sample Telemetry Stream</Badge>
          <span className="text-charcoal-600 font-medium">
            Feed Gateway: <span className="font-mono text-charcoal-800">{overview.dataSourceLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-charcoal-500 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Polling: Active (5s heartbeat)
          </span>
          <span className="text-gray-300">•</span>
          <span>Last Sync: {new Date(overview.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Top 5 KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Electricity Demand */}
        <StatCard
          title="Electricity Demand"
          value={overview.electricity.currentKwh.toLocaleString()}
          unit={overview.electricity.unit}
          icon={Zap}
          delta={{ value: '4.2%', isPositive: true }}
          subtext={`Grid: ${overview.electricity.gridKwh} kWh • Solar: ${overview.electricity.solarKwh} kWh`}
          isSimulated={overview.isSimulated}
        />

        {/* Water Consumption */}
        <StatCard
          title="Water Consumption"
          value={overview.water.currentLiters.toLocaleString()}
          unit="Liters"
          icon={Droplet}
          delta={{ value: '2.1%', isPositive: false }}
          subtext={`Recycled: ${overview.water.recycledLiters.toLocaleString()} L (${overview.water.recyclingRate}%)`}
          isSimulated={overview.isSimulated}
        />

        {/* Waste Diversion */}
        <StatCard
          title="Waste Diversion"
          value={overview.waste.diversionRate}
          unit="%"
          icon={Trash2}
          delta={{ value: '8.5%', isPositive: true }}
          subtext={`Total: ${overview.waste.currentKg} kg (Organic: ${overview.waste.organicKg} kg)`}
          isSimulated={overview.isSimulated}
        />

        {/* Carbon Footprint */}
        <StatCard
          title="Campus Carbon Net"
          value={overview.carbon.currentCo2e}
          unit="tCO2e"
          icon={Leaf}
          delta={{ value: '16.4%', isPositive: true }}
          subtext={`Reduction vs baseline: -${overview.carbon.reductionVsBaselinePercent}%`}
          isSimulated={overview.isSimulated}
        />

        {/* Active Anomalies */}
        <StatCard
          title="Active Anomalies"
          value={overview.alertsSummary.total}
          unit="Issues"
          icon={AlertTriangle}
          subtext={`Critical: ${overview.alertsSummary.critical} • High: ${overview.alertsSummary.high}`}
          isSimulated={overview.isSimulated}
        />
      </div>

      {/* Two Column Analytical Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 24-Hour Energy Profile */}
        <div className="lg:col-span-7 card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-forest-700" />
                  24-Hour Energy Balance: Grid Demand vs Solar PV
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Rooftop solar generation offsets HVAC daytime peaks. Note 04:00 AM off-cycle spike.
                </p>
              </div>
              <span className="text-[11px] font-mono text-charcoal-400">Hourly SCADA Aggregation</span>
            </div>

            <div className="w-full h-72 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gridDemandColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#334155" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#334155" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="solarGenColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#164E3D" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#164E3D" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit=" kWh" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="grid"
                    name="Grid Demand (kWh)"
                    stroke="#475569"
                    fillOpacity={1}
                    fill="url(#gridDemandColor)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="solar"
                    name="Solar PV Generation (kWh)"
                    stroke="#164E3D"
                    fillOpacity={1}
                    fill="url(#solarGenColor)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-charcoal-500 flex items-center justify-between">
            <span>Peak solar yield: 320 kWh at 12:00 PM</span>
            <span className="font-medium text-forest-700">180 kW Array Online</span>
          </div>
        </div>

        {/* Building Demand Comparison BarChart */}
        <div className="lg:col-span-5 card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-700" />
                  Facility Energy Distribution
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">Electricity demand by campus facility</p>
              </div>
              <button
                onClick={() => onNavigateToTab('map')}
                className="text-xs text-forest-700 hover:text-forest-800 flex items-center gap-1 font-semibold"
              >
                Campus Map <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="w-full h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildingComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit=" kWh" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="demand" name="Demand (kWh)" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="solar" name="Solar Gen (kWh)" fill="#164E3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-charcoal-500 flex items-center justify-between">
            <span>Engineering Block draws highest power load</span>
            <span className="text-forest-700 font-medium">Bifacial PV Active</span>
          </div>
        </div>
      </div>

      {/* Facilities Overview Cards & High Priority Anomaly Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Facilities Grid */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-forest-700" />
              Campus Facilities & Health Indices
            </h3>
            <button
              onClick={() => onNavigateToTab('buildings')}
              className="text-xs text-forest-700 hover:text-forest-800 font-semibold flex items-center gap-1"
            >
              All Facilities <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {buildings.map((building) => (
              <div
                key={building.id}
                onClick={() => onSelectBuilding(building.id)}
                className="card-interactive p-4 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-charcoal-900 group-hover:text-forest-800 transition-colors">
                      {building.name}
                    </h4>
                    <span className="text-[10px] text-charcoal-500 font-mono">{building.code}</span>
                  </div>
                  <Badge variant={building.status}>{building.status}</Badge>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs text-charcoal-500">Sustainability Score:</span>
                  <span className="text-base font-bold text-charcoal-900 font-mono">
                    {building.efficiencyScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-forest-700 h-full rounded-full transition-all duration-300"
                    style={{ width: `${building.efficiencyScore}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-[11px] text-charcoal-600">
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Electricity</span>
                    <span className="font-semibold text-charcoal-800">{building.resources.electricityKwh} kWh</span>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Water</span>
                    <span className="font-semibold text-charcoal-800">{building.resources.waterLiters.toLocaleString()} L</span>
                  </div>
                </div>

                {building.anomalies.length > 0 && (
                  <div className="mt-2.5 p-2 rounded bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                    <span className="truncate">{building.anomalies[0].title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* High Priority Active Issues Feed */}
        <div className="lg:col-span-5 card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold text-charcoal-900">Critical & High Priority Anomalies</h3>
              </div>
              <button
                onClick={() => onNavigateToTab('alerts')}
                className="text-xs text-forest-700 hover:text-forest-800 font-semibold flex items-center gap-1"
              >
                View All ({alerts.length}) <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 mt-3.5">
              {highPriorityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity}>{alert.severity}</Badge>
                        <span className="text-xs font-semibold text-charcoal-800">{alert.buildingName}</span>
                      </div>
                      <h4 className="text-xs font-bold text-charcoal-900 mt-1">{alert.title}</h4>
                      <p className="text-[11px] text-charcoal-600 line-clamp-2">{alert.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-charcoal-500 font-mono text-[10px]">{alert.equipmentId}</span>
                    <button
                      onClick={() => onInvestigateAlert(alert.id, alert.buildingId)}
                      className="px-2.5 py-1 rounded bg-forest-800 hover:bg-forest-900 text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Bot className="h-3 w-3 text-white" />
                      Investigate with EcoPilot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-charcoal-500">
            <span>Root-cause telemetry analysis:</span>
            <button
              onClick={() => onNavigateToTab('agent')}
              className="font-semibold text-forest-700 hover:text-forest-800 flex items-center gap-1"
            >
              Open EcoPilot Assistant <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Campus Camera Surveillance & Real Waste Detections */}
      <div className="card-clean p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-forest-700" />
              <h3 className="text-sm font-bold text-charcoal-900">
                Latest Camera Detections
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <span className={`h-1.5 w-1.5 rounded-full ${realtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {realtimeActive ? 'Supabase Realtime Active' : 'Polling Sync'}
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Genuine visual-memory detection events captured from shared laptop webcam across 4 campus profiles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('camera-events')}
              className="text-xs text-forest-700 hover:text-forest-800 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg border border-forest-200 bg-forest-50/50 hover:bg-forest-100/50 transition-colors"
            >
              View All Events <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {isLoadingCamera && cameraEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-charcoal-500">
            Checking Supabase camera_events table...
          </div>
        ) : cameraEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-charcoal-500">
            <Camera className="h-8 w-8 text-charcoal-300 mx-auto mb-2" />
            <p className="font-semibold text-charcoal-800">No Real Camera Detections Persisted Yet</p>
            <p className="text-[11px] text-charcoal-500 mt-1">
              Start the Python camera service (<code>python run_camera_admin.py</code>) to capture real frames and teach reference items.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {cameraEvents.slice(0, 4).map((ev) => {
              const score =
                ev.similarity_score !== undefined
                  ? Math.round(ev.similarity_score * 100)
                  : Math.round((ev.confidence || 0.85) * 100);
              const status = ev.review_status || 'pending_review';
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedDrawerEvent(ev);
                    setIsDrawerOpen(true);
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-forest-300 hover:shadow-xs transition-all cursor-pointer overflow-hidden flex flex-col group"
                >
                  <div className="relative aspect-video bg-navy-950 flex items-center justify-center overflow-hidden">
                    {ev.evidence_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.evidence_image_url}
                        alt={ev.item_name || ev.detected_class}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Camera className="h-6 w-6 text-slate-500" />
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-mono bg-navy-950/80 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                      {ev.camera_id}
                    </span>
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono bg-navy-950/80 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      {score}% similarity
                    </span>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-charcoal-900 capitalize truncate">
                          {ev.item_name || ev.detected_class}
                        </span>
                        <Badge
                          size="sm"
                          variant={
                            status === 'verified_waste'
                              ? 'critical'
                              : status === 'resolved'
                              ? 'normal'
                              : status === 'false_positive'
                              ? 'low'
                              : 'warning'
                          }
                        >
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-charcoal-500 mt-1 truncate">
                        {ev.building_name || ev.building_id} • {ev.zone || 'Zone not configured'}
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-charcoal-400">
                      <span>
                        {(ev.detected_at || ev.timestamp)
                          ? new Date(ev.detected_at || ev.timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Recent'}
                      </span>
                      <span className="text-forest-700 font-semibold group-hover:underline flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" /> Inspect
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Detail Drawer */}
      <EventDetailDrawer
        event={selectedDrawerEvent}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDrawerEvent(null);
        }}
        onUpdateStatus={handleUpdateStatus}
        onAskAgent={onInvestigateCameraEvent}
      />
    </div>
  );
}
