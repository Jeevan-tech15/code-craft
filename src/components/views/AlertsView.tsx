'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, BuildingId, CameraEvent } from '@/types';
import { apiClient } from '@/lib/api-client';
import { getSupabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { EventDetailDrawer } from '@/components/views/EventDetailDrawer';
import {
  ShieldAlert,
  AlertTriangle,
  Filter,
  Bot,
  CheckCircle2,
  Clock,
  ArrowRight,
  HelpCircle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Building2,
  Search,
  Camera,
  Radio,
  RefreshCw,
  ExternalLink,
  Eye,
  Info,
  Layers,
} from 'lucide-react';

interface AlertsViewProps {
  alerts: Alert[];
  onInvestigateAlert: (alertId: string, buildingId: BuildingId) => void;
  onScheduleFollowUp: (alertId: string, buildingId: BuildingId) => void;
  onNavigateToBuilding: (buildingId: BuildingId) => void;
  onInvestigateCameraEvent?: (event: CameraEvent) => void;
  initialMode?: 'camera' | 'scada';
}

export function AlertsView({
  alerts,
  onInvestigateAlert,
  onScheduleFollowUp,
  onNavigateToBuilding,
  onInvestigateCameraEvent,
  initialMode = 'camera',
}: AlertsViewProps) {
  // Mode selection: 'camera' vs 'scada'
  const [activeMode, setActiveMode] = useState<'camera' | 'scada'>(initialMode);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  // Camera events state
  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>([]);
  const [isLoadingCameraEvents, setIsLoadingCameraEvents] = useState(true);
  const [cameraFetchError, setCameraFetchError] = useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Selected event for detail drawer
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState<CameraEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters for Camera Events
  const [camBuildingFilter, setCamBuildingFilter] = useState<string>('all');
  const [camCameraFilter, setCamCameraFilter] = useState<string>('all');
  const [camCategoryFilter, setCamCategoryFilter] = useState<string>('all');
  const [camStatusFilter, setCamStatusFilter] = useState<string>('all');
  const [camSearchQuery, setCamSearchQuery] = useState<string>('');

  // Filters for SCADA Alerts
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(alerts[0]?.id || null);

  // 1. Fetch real camera events
  const loadCameraEvents = useCallback(async () => {
    try {
      setCameraFetchError(null);
      const res = await apiClient.getCameraEvents({
        buildingId: camBuildingFilter !== 'all' ? camBuildingFilter : undefined,
        cameraId: camCameraFilter !== 'all' ? camCameraFilter : undefined,
        wasteCategory: camCategoryFilter !== 'all' ? camCategoryFilter : undefined,
        reviewStatus: camStatusFilter !== 'all' ? camStatusFilter : undefined,
      });

      if (res.error) {
        setCameraFetchError(res.error.message);
      } else if (res.data) {
        setCameraEvents(res.data);
      }
      setLastRefreshedAt(new Date());
    } catch (err: unknown) {
      setCameraFetchError(err instanceof Error ? err.message : 'Failed to fetch camera events');
    } finally {
      setIsLoadingCameraEvents(false);
    }
  }, [camBuildingFilter, camCameraFilter, camCategoryFilter, camStatusFilter]);

  // Initial load
  useEffect(() => {
    loadCameraEvents();
  }, [loadCameraEvents]);

  // 2. Set up Supabase Realtime channel with 8s polling fallback
  useEffect(() => {
    let channel: any = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel('realtime_camera_events_alerts_view')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'camera_events' },
          (payload: any) => {
            console.log('Realtime camera event received in AlertsView:', payload);
            loadCameraEvents();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeActive(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeActive(false);
          }
        });
    } catch (err) {
      console.warn('Supabase Realtime not available, using polling fallback:', err);
      setRealtimeActive(false);
    }

    // Polling fallback every 8 seconds
    const interval = setInterval(() => {
      loadCameraEvents();
    }, 8000);

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (_) {}
      }
    };
  }, [loadCameraEvents]);

  // Handle status update from detail drawer
  const handleUpdateStatus = async (
    eventId: string,
    newStatus: 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved',
    notes?: string
  ) => {
    const res = await apiClient.updateEventReviewStatus(eventId, newStatus, notes);
    if (res.error) {
      throw new Error(res.error.message);
    }
    // Update local state
    setCameraEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, review_status: newStatus, notes: notes || e.notes } : e))
    );
    if (selectedDrawerEvent?.id === eventId) {
      setSelectedDrawerEvent((prev) => (prev ? { ...prev, review_status: newStatus, notes: notes || prev.notes } : null));
    }
  };

  // Filtered Camera Events
  const filteredCameraEvents = cameraEvents.filter((ev) => {
    if (camBuildingFilter !== 'all' && ev.building_id !== camBuildingFilter) return false;
    if (camCameraFilter !== 'all' && ev.camera_id !== camCameraFilter) return false;
    if (
      camCategoryFilter !== 'all' &&
      ev.waste_category?.toLowerCase() !== camCategoryFilter.toLowerCase() &&
      ev.detected_class?.toLowerCase() !== camCategoryFilter.toLowerCase()
    ) {
      return false;
    }
    if (camStatusFilter !== 'all' && (ev.review_status || 'pending_review') !== camStatusFilter) {
      return false;
    }
    if (camSearchQuery) {
      const q = camSearchQuery.toLowerCase();
      const matchName = (ev.item_name || ev.detected_class || '').toLowerCase().includes(q);
      const matchBldg = (ev.building_name || ev.building_id || '').toLowerCase().includes(q);
      const matchId = (ev.id || '').toLowerCase().includes(q);
      const matchCode = (ev.event_code || '').toLowerCase().includes(q);
      if (!matchName && !matchBldg && !matchId && !matchCode) return false;
    }
    return true;
  });

  // Filtered SCADA Alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (buildingFilter !== 'all' && alert.buildingId !== buildingFilter) return false;
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.equipmentId.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Top Stream Distinction Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-gray-200">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveMode('camera')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              activeMode === 'camera'
                ? 'bg-white text-forest-900 shadow-xs border border-gray-200 font-bold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-forest-700" />
            <span>Camera Waste Detections</span>
            <span className="font-mono text-[10px] bg-forest-100 text-forest-800 px-1.5 py-0.2 rounded">
              {cameraEvents.length} Real
            </span>
          </button>

          <button
            onClick={() => setActiveMode('scada')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              activeMode === 'scada'
                ? 'bg-white text-charcoal-900 shadow-xs border border-gray-200 font-bold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span>SCADA Facility Anomalies</span>
            <span className="font-mono text-[10px] bg-gray-200 text-charcoal-700 px-1.5 py-0.2 rounded">
              {alerts.length} Sample
            </span>
          </button>
        </div>

        {/* Realtime / Refresh Status */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 px-2">
          {activeMode === 'camera' && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {realtimeActive ? 'Supabase Realtime Sync' : '8s Polling Fallback'}
            </span>
          )}
          <button
            onClick={loadCameraEvents}
            disabled={isLoadingCameraEvents}
            className="p-1.5 rounded hover:bg-gray-100 text-charcoal-500 hover:text-charcoal-800 transition-colors"
            title="Refresh events now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCameraEvents ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODE 1: REAL CAMERA WASTE DETECTIONS                             */}
      {/* ================================================================ */}
      {activeMode === 'camera' && (
        <div className="space-y-4">
          {/* Hardware & Matcher Disclosure Banner */}
          <div className="card-clean p-4 bg-gradient-to-r from-forest-50/50 via-white to-cyan-50/40 border border-forest-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 text-forest-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-charcoal-900">
                  Live Visual-Memory Teach & Remember Detections
                </p>
                <p className="text-charcoal-600 text-[11px] mt-0.5">
                  Detections originate from the live Python camera service via SIFT homography matching.
                  All 4 logical camera profiles sequentially share <strong>one physical laptop webcam</strong>.
                  Confidence scores represent visual similarity to taught reference items, not calibrated AI probabilities.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-charcoal-500 whitespace-nowrap self-end md:self-auto">
              Sync: {lastRefreshedAt.toLocaleTimeString()}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="card-clean p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-forest-700" />
                <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                  Filter Recorded Camera Events
                </h3>
              </div>
              <span className="text-xs text-charcoal-500">
                Showing <strong className="text-charcoal-900 font-mono">{filteredCameraEvents.length}</strong> of{' '}
                {cameraEvents.length} database records
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
              {/* Keyword Search */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Search Item / Code</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search item, code..."
                    value={camSearchQuery}
                    onChange={(e) => setCamSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-600"
                  />
                  {camSearchQuery && (
                    <button
                      onClick={() => setCamSearchQuery('')}
                      className="absolute right-2 top-2 text-charcoal-400 hover:text-charcoal-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Building */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Building</label>
                <select
                  value={camBuildingFilter}
                  onChange={(e) => setCamBuildingFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Buildings</option>
                  <option value="engineering">Engineering Block</option>
                  <option value="library">Central Library</option>
                  <option value="laboratory">Science Laboratory</option>
                  <option value="cafeteria">Dining Commons</option>
                </select>
              </div>

              {/* Logical Camera Profile */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Logical Camera Profile</label>
                <select
                  value={camCameraFilter}
                  onChange={(e) => setCamCameraFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Profiles</option>
                  <option value="camera-1">Camera 1 (Engineering)</option>
                  <option value="camera-2">Camera 2 (Library)</option>
                  <option value="camera-3">Camera 3 (Laboratory)</option>
                  <option value="camera-4">Camera 4 (Cafeteria)</option>
                </select>
              </div>

              {/* Waste Category */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Waste Category</label>
                <select
                  value={camCategoryFilter}
                  onChange={(e) => setCamCategoryFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Categories</option>
                  <option value="plastic">Plastic</option>
                  <option value="paper">Paper / Cardboard</option>
                  <option value="organic">Organic / Food</option>
                  <option value="metal">Metal / Can</option>
                  <option value="electronic">E-Waste</option>
                  <option value="general">General Waste</option>
                </select>
              </div>

              {/* Review Status */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Review Status</label>
                <select
                  value={camStatusFilter}
                  onChange={(e) => setCamStatusFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Review States</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="verified_waste">Verified Waste</option>
                  <option value="false_positive">False Positive</option>
                  <option value="resolved">Resolved / Cleared</option>
                </select>
              </div>
            </div>
          </div>

          {/* Camera Events List */}
          {isLoadingCameraEvents && cameraEvents.length === 0 ? (
            <div className="card-clean p-12 text-center text-xs text-charcoal-500">
              <RefreshCw className="h-6 w-6 text-forest-700 animate-spin mx-auto mb-2" />
              Loading real camera detection records from Supabase...
            </div>
          ) : cameraFetchError && cameraEvents.length === 0 ? (
            <div className="card-clean p-8 bg-rose-50/50 border border-rose-200 text-center text-xs text-rose-800">
              <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto mb-2" />
              <p className="font-semibold">Unable to connect to Supabase camera events table</p>
              <p className="text-[11px] text-rose-600 mt-1">{cameraFetchError}</p>
            </div>
          ) : filteredCameraEvents.length === 0 ? (
            <div className="card-clean p-12 text-center text-xs text-charcoal-500">
              <Camera className="h-8 w-8 text-charcoal-300 mx-auto mb-2" />
              <p className="font-bold text-charcoal-800">No camera detections match current filters</p>
              <p className="text-[11px] text-charcoal-500 mt-1 max-w-md mx-auto">
                No events recorded for this selection. Start the Python camera console (<code>python run_camera_admin.py</code>)
                and teach an item to trigger real detections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCameraEvents.map((ev) => {
                const scorePercent =
                  ev.similarity_score !== undefined
                    ? Math.round(ev.similarity_score * 100)
                    : Math.round((ev.confidence || 0.85) * 100);

                const status = ev.review_status || 'pending_review';
                const statusBadgeVariant =
                  status === 'verified_waste'
                    ? 'critical'
                    : status === 'resolved'
                    ? 'normal'
                    : status === 'false_positive'
                    ? 'low'
                    : 'warning';

                const rawDate = ev.detected_at || ev.timestamp;
                const eventTime = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const eventDate = rawDate ? new Date(rawDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                return (
                  <div
                    key={ev.id}
                    className="card-clean overflow-hidden hover:border-forest-300 transition-all duration-200 flex flex-col group shadow-2xs"
                  >
                    {/* Thumbnail Frame */}
                    <div
                      onClick={() => {
                        setSelectedDrawerEvent(ev);
                        setIsDrawerOpen(true);
                      }}
                      className="relative aspect-video bg-navy-950 cursor-pointer overflow-hidden flex items-center justify-center"
                    >
                      {ev.evidence_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.evidence_image_url}
                          alt={ev.item_name || ev.detected_class}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}

                      {/* Fallback frame if no URL */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-navy-950/90 p-4 text-center pointer-events-none">
                        {!ev.evidence_image_url && (
                          <>
                            <Camera className="h-7 w-7 text-slate-500 mb-1" />
                            <span className="text-[10px] text-slate-300 font-mono">Snapshot Missing</span>
                          </>
                        )}
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                        <span className="bg-navy-950/85 backdrop-blur-sm border border-cyan-500/40 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded">
                          {ev.camera_id}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2 pointer-events-none">
                        <Badge variant={statusBadgeVariant} size="sm">
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Similarity Tag Overlay */}
                      <div className="absolute bottom-2 left-2 bg-navy-950/85 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                        {scorePercent}% Visual Similarity
                      </div>

                      {/* Hover Inspect Overlay */}
                      <div className="absolute inset-0 bg-forest-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
                        <Eye className="h-4 w-4" /> Inspect Evidence
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-charcoal-900 capitalize">
                            {ev.item_name || ev.detected_class}
                          </h4>
                          <span className="text-[10px] uppercase font-semibold text-charcoal-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {ev.waste_category || 'General'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] text-charcoal-500 mt-2">
                          <div className="flex items-center gap-1.5 text-charcoal-700">
                            <Building2 className="h-3 w-3 text-forest-600 flex-shrink-0" />
                            <span className="font-medium truncate">{ev.building_name || ev.building_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-charcoal-400 flex-shrink-0" />
                            <span>
                              {eventDate} • {eventTime}
                            </span>
                          </div>
                          <div className="text-[10px] text-charcoal-500">
                            <span className="font-medium">Zone:</span> {ev.zone || 'Zone not configured'}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedDrawerEvent(ev);
                            setIsDrawerOpen(true);
                          }}
                          className="text-xs text-forest-700 hover:text-forest-900 font-semibold flex items-center gap-1"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          Review & Guidance
                        </button>

                        {onInvestigateCameraEvent && (
                          <button
                            onClick={() => onInvestigateCameraEvent(ev)}
                            className="p-1.5 rounded hover:bg-cyan-50 text-cyan-700 hover:text-cyan-900 transition-colors"
                            title="Ask EcoPilot AI about this detection"
                          >
                            <Bot className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* MODE 2: SCADA TELEMETRY ANOMALIES                                */}
      {/* ================================================================ */}
      {activeMode === 'scada' && (
        <div className="space-y-6">
          {/* Header & Filter Toolbar */}
          <div className="card-clean p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <h2 className="text-sm font-bold text-charcoal-900">
                    Operational Telemetry Anomalies & Event Dispatch
                  </h2>
                  <Badge variant="simulated">Sample Stream</Badge>
                </div>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Automated anomaly detection across campus SCADA infrastructure. Follow-up verification is required before closure.
                </p>
              </div>

              <div className="text-xs text-charcoal-500">
                Showing <strong className="text-charcoal-900 font-mono">{filteredAlerts.length}</strong> of {alerts.length} total records
              </div>
            </div>

            {/* Filter Toolbar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
              {/* Keyword Search */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Search Keywords</label>
                <input
                  type="text"
                  placeholder="Search title, equipment ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-600"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Facility */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Facility Target</label>
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Facilities</option>
                  <option value="engineering">Engineering Block</option>
                  <option value="library">Central Library</option>
                  <option value="laboratory">Science Laboratory</option>
                  <option value="cafeteria">Dining Commons</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Operational Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="follow_up_scheduled">Follow-up Scheduled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operational Alerts List */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="card-clean p-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                <h4 className="text-xs font-bold text-charcoal-900">No matching anomalies found</h4>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Adjust your search keywords or filter criteria to view active records.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isExpanded = expandedAlertId === alert.id;

                return (
                  <div key={alert.id} className="card-clean overflow-hidden transition-all duration-150">
                    {/* Summary Row */}
                    <div
                      onClick={() => toggleExpand(alert.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Badge variant={alert.severity}>{alert.severity}</Badge>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xs font-bold text-charcoal-900">{alert.title}</h3>
                            <span className="text-[11px] text-charcoal-400 font-mono">({alert.id})</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500 mt-1">
                            <span className="font-semibold text-charcoal-800">{alert.buildingName}</span>
                            <span>•</span>
                            <span className="capitalize">{alert.category}</span>
                            <span>•</span>
                            <span className="font-mono text-charcoal-600">{alert.equipmentId}</span>
                            <span>•</span>
                            <span>{alert.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        <Badge variant={alert.status}>{alert.status.replace('_', ' ')}</Badge>
                        <button className="text-charcoal-400 hover:text-charcoal-700 p-1">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Operational Detail */}
                    {isExpanded && (
                      <div className="p-5 bg-gray-50/60 border-t border-gray-200 space-y-4">
                        <p className="text-xs text-charcoal-700 leading-relaxed">{alert.description}</p>

                        <div>
                          <h4 className="text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-2">
                            Supporting Telemetry Evidence
                          </h4>
                          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-50 text-charcoal-500 border-b border-gray-200">
                                <tr>
                                  <th className="py-2 px-3 font-semibold">Telemetry Metric</th>
                                  <th className="py-2 px-3 font-semibold">Measured Value</th>
                                  <th className="py-2 px-3 font-semibold">Nominal Range</th>
                                  <th className="py-2 px-3 font-semibold">Deviation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                                {alert.supportingReadings && alert.supportingReadings.length > 0 ? (
                                  alert.supportingReadings.map((reading, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 px-3 font-sans font-medium text-charcoal-900">
                                        {reading.metric}
                                      </td>
                                      <td className="py-2 px-3 text-rose-700 font-bold">{reading.value}</td>
                                      <td className="py-2 px-3 text-charcoal-600">{reading.normalRange}</td>
                                      <td className="py-2 px-3 text-amber-800 font-semibold">{reading.deviation}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={4} className="py-3 px-3 text-center text-charcoal-400 font-sans text-xs italic">
                                      No direct sensor telemetry deviations attached to this record.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3.5 rounded bg-white border border-gray-200">
                            <span className="text-xs font-bold text-charcoal-900 block mb-2">
                              Potential Root Causes
                            </span>
                            <ul className="space-y-1.5 text-xs text-charcoal-600 list-disc list-inside">
                              {(alert.possibleCauses && alert.possibleCauses.length > 0) ? (
                                alert.possibleCauses.map((cause, i) => (
                                  <li key={i}>{cause}</li>
                                ))
                              ) : (
                                <li className="italic text-charcoal-400 list-none">Under investigation by campus engineering staff.</li>
                              )}
                            </ul>
                          </div>

                          <div className="p-3.5 rounded bg-white border border-gray-200">
                            <span className="text-xs font-bold text-charcoal-900 block mb-2">
                              Recommended Engineering Protocol
                            </span>
                            <ul className="space-y-1.5 text-xs text-charcoal-600 list-decimal list-inside">
                              {(alert.nextActions && alert.nextActions.length > 0) ? (
                                alert.nextActions.map((action, i) => (
                                  <li key={i}>{action}</li>
                                ))
                              ) : (
                                <li className="italic text-charcoal-400 list-none">Perform standard physical inspection of target equipment.</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                          <button
                            onClick={() => onNavigateToBuilding(alert.buildingId)}
                            className="text-xs text-charcoal-600 hover:text-charcoal-900 flex items-center gap-1.5 font-medium"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            Inspect {alert.buildingName} Telemetry
                          </button>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              onClick={() => onScheduleFollowUp(alert.id, alert.buildingId)}
                              className="px-3 py-1.5 rounded bg-white hover:bg-gray-100 text-charcoal-800 border border-gray-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <FileCheck className="h-3.5 w-3.5 text-emerald-700" />
                              Record Follow-up Verification
                            </button>

                            <button
                              onClick={() => onInvestigateAlert(alert.id, alert.buildingId)}
                              className="px-3.5 py-1.5 rounded bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Bot className="h-3.5 w-3.5 text-white" />
                              Investigate with EcoPilot
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Detail Drawer Modal */}
      <EventDetailDrawer
        event={selectedDrawerEvent}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDrawerEvent(null);
        }}
        onUpdateStatus={handleUpdateStatus}
        onAskAgent={
          onInvestigateCameraEvent
            ? (ev) => {
                onInvestigateCameraEvent(ev);
              }
            : undefined
        }
      />
    </div>
  );
}
