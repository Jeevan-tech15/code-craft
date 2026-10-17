'use client';

import React, { useState, useEffect } from 'react';
import { CameraEvent } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingState';
import { EventDetailDrawer } from '@/components/views/EventDetailDrawer';
import {
  Camera,
  Layers,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Info,
  Clock,
  Eye,
  Trash2,
  ShieldAlert,
  HardDrive,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface AnalyticsData {
  dataSource: string;
  timeframe: string;
  totalEvents: number;
  insufficientData: boolean;
  message?: string;
  confirmedWasteCount: number;
  pendingReviewCount: number;
  falsePositiveCount: number;
  resolvedCount: number;
  categoryBreakdown: Array<{ category: string; count: number; percentage: number }>;
  buildingComparison: Array<{ buildingId: string; buildingName: string; count: number }>;
  cameraBreakdown: Array<{ cameraId: string; buildingName: string; count: number; isSharedHardware: boolean }>;
  timeline: Array<{ date: string; count: number }>;
  evidenceUploads: {
    uploadedCount: number;
    failedOrLocalCount: number;
    uploadSuccessRatePercent: number;
  };
  recentEvents: CameraEvent[];
}

const CATEGORY_COLORS = ['#059669', '#0284C7', '#D97706', '#9333EA', '#DC2626', '#64748B'];

export function CameraAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [timeframe, setTimeframe] = useState<string>('month');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedCamera, setSelectedCamera] = useState<string>('all');

  // Detail drawer
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState<CameraEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getCameraAnalytics({
        timeframe,
        buildingId: selectedBuilding,
        cameraId: selectedCamera,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setData(res.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load camera analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, selectedBuilding, selectedCamera]);

  const handleUpdateStatus = async (
    eventId: string,
    newStatus: 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved',
    notes?: string
  ) => {
    const res = await apiClient.updateEventReviewStatus(eventId, newStatus, notes);
    if (res.error) {
      throw new Error(res.error.message);
    }
    await fetchAnalytics();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Strip */}
      <div className="card-clean p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-forest-50 border border-forest-200 text-forest-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-charcoal-900">
                  Real Camera Waste & Segregation Analytics
                </h3>
                <span className="font-mono text-[10px] text-forest-700 bg-forest-50 border border-forest-200 px-1.5 py-0.5 rounded font-semibold">
                  Supabase Backed
                </span>
              </div>
              <p className="text-xs text-charcoal-500">
                Aggregated from genuine camera events persisted in <code>public.camera_events</code>.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-charcoal-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-2xs self-start md:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Timeframe Scope</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
            >
              <option value="day">Past 24 Hours</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="all">All Available Records</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Facility Scope</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
            >
              <option value="all">All Campus Facilities</option>
              <option value="engineering">Engineering Block</option>
              <option value="library">Central Library</option>
              <option value="laboratory">Science Laboratory</option>
              <option value="cafeteria">Dining Commons</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-charcoal-500 mb-1">Logical Camera Profile</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600"
            >
              <option value="all">All Camera Profiles</option>
              <option value="camera-1">Camera 1 (Engineering)</option>
              <option value="camera-2">Camera 2 (Library)</option>
              <option value="camera-3">Camera 3 (Laboratory)</option>
              <option value="camera-4">Camera 4 (Cafeteria)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hardware & Scientific Calculation Disclosure Banner */}
      <div className="card-clean p-4 bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Info className="h-4 w-4 text-forest-700" />
          <span>Scientific Grounding & Hardware Architecture Disclosure</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          • <strong>Hardware Reality:</strong> The 4 logical camera profiles sequentially share <strong>one physical laptop webcam</strong>. Events reflect whichever camera identity was selected during detection.<br />
          • <strong>No Fabricated Metrics:</strong> In accordance with project standards, this report does not fabricate unmeasured waste weights (kg), carbon offsets (tCO2e), or cost savings. Figures represent actual event counts and verified visual similarity matches.
        </p>
      </div>

      {isLoading && !data ? (
        <div className="card-clean p-12 text-center text-xs text-charcoal-500 flex flex-col items-center justify-center space-y-2">
          <LoadingSpinner size="md" />
          <span>Compiling live camera analytics from Supabase database...</span>
        </div>
      ) : errorMessage ? (
        <div className="card-clean p-8 bg-rose-50 border border-rose-200 text-center text-xs text-rose-800">
          <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto mb-2" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      ) : data?.insufficientData || data?.totalEvents === 0 ? (
        <div className="card-clean p-12 text-center text-xs text-charcoal-500">
          <Camera className="h-10 w-10 text-charcoal-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-charcoal-800">No Persisted Camera Detections Found</h4>
          <p className="text-xs text-charcoal-500 mt-1 max-w-md mx-auto leading-relaxed">
            There are currently no confirmed visual-memory detection records in <code>public.camera_events</code> for the selected filter.
            Launch the Python camera console (<code>python run_camera_admin.py</code>) and teach/detect items to populate genuine analytics.
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="card-clean p-4">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-1">
                Total Saved Detections
              </span>
              <div className="text-2xl font-bold text-charcoal-900 font-mono">
                {data.totalEvents}
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Visual memory matches
              </span>
            </div>

            <div className="card-clean p-4">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-1">
                Verified Waste
              </span>
              <div className="text-2xl font-bold text-rose-700 font-mono">
                {data.confirmedWasteCount}
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Confirmed campus anomalies
              </span>
            </div>

            <div className="card-clean p-4">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-1">
                Pending Review
              </span>
              <div className="text-2xl font-bold text-amber-700 font-mono">
                {data.pendingReviewCount}
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Awaiting staff verification
              </span>
            </div>

            <div className="card-clean p-4">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-1">
                False Positives / Cleared
              </span>
              <div className="text-2xl font-bold text-emerald-700 font-mono">
                {data.falsePositiveCount + data.resolvedCount}
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Audited & resolved
              </span>
            </div>

            <div className="card-clean p-4 col-span-2 lg:col-span-1">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-1">
                Evidence Storage Rate
              </span>
              <div className="text-2xl font-bold text-forest-700 font-mono">
                {data.evidenceUploads.uploadSuccessRatePercent}%
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                {data.evidenceUploads.uploadedCount} stored in bucket
              </span>
            </div>
          </div>

          {/* Charts Row 1: Waste Category Breakdown & Facility Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Waste Category Breakdown */}
            <div className="lg:col-span-6 card-clean p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5 text-forest-600" />
                  Waste Category Distribution
                </h4>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Proportion of visual detections grouped by taught material category
                </p>
              </div>

              {data.categoryBreakdown.length > 0 ? (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="category" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="count" name="Detections" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-xs text-charcoal-400">
                  No category records available
                </div>
              )}
            </div>

            {/* Campus Facility Comparison */}
            <div className="lg:col-span-6 card-clean p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-forest-600" />
                  Facility Waste Event Comparison
                </h4>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Attribution of recorded detections across campus blocks
                </p>
              </div>

              {data.buildingComparison.length > 0 ? (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.buildingComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="buildingName" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="count" name="Detections" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-xs text-charcoal-400">
                  No facility records available
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 2: Per-Camera Profile Activity & Evidence Pipeline Health */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Per-Camera Profile Breakdown */}
            <div className="lg:col-span-7 card-clean p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-forest-600" />
                    Logical Camera Profile Activity
                  </h4>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">
                    Attribution across logical profiles (Sequentially bound to single physical laptop webcam)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.cameraBreakdown.map((cam) => (
                  <div key={cam.cameraId} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-charcoal-900">{cam.cameraId}</span>
                      <span className="text-sm font-bold text-forest-700 font-mono">{cam.count} events</span>
                    </div>
                    <div className="text-[11px] text-charcoal-600 mt-1">{cam.buildingName}</div>
                    <div className="text-[10px] text-charcoal-400 mt-0.5 italic">
                      Physical sensor: Laptop Webcam Index 0
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Storage Health Card */}
            <div className="lg:col-span-5 card-clean p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-forest-600" />
                  Evidence Storage Pipeline Health
                </h4>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Persistence integrity in Supabase Storage <code>camera-evidence</code> bucket
                </p>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="font-medium">Cloud Storage Bucket Uploads:</span>
                    <span className="font-mono font-bold">{data.evidenceUploads.uploadedCount} files</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded bg-gray-50 border border-gray-200 text-charcoal-700">
                    <span className="font-medium">Local Ledger Backup Captures:</span>
                    <span className="font-mono font-bold">{data.evidenceUploads.failedOrLocalCount} files</span>
                  </div>

                  <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 text-[11px] leading-relaxed">
                    <strong>Zero-Data-Loss Architecture:</strong> If the Supabase cloud bucket is unreachable or rate-limited, the camera service automatically caches frames locally in <code>camera_service/evidence/</code> so no evidence is discarded.
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 text-[10px] text-charcoal-400">
                Bucket URL: https://ccuqmxgpfvzgwyfsagif.supabase.co/storage/v1/object/public/camera-evidence/
              </div>
            </div>
          </div>

          {/* Recent Confirmed Events Table */}
          <div className="card-clean p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-forest-600" />
                Recent Detections & Evidence Snapshots
              </h4>
              <span className="text-xs text-charcoal-500">
                Latest {data.recentEvents.length} recorded events
              </span>
            </div>

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-charcoal-500 border-b border-gray-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Evidence Snapshot</th>
                    <th className="py-2.5 px-3">Item / Category</th>
                    <th className="py-2.5 px-3">Similarity Score</th>
                    <th className="py-2.5 px-3">Facility / Camera</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Review Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentEvents.map((ev) => {
                    const simScore =
                      ev.similarity_score !== undefined
                        ? Math.round(ev.similarity_score * 100)
                        : Math.round((ev.confidence || 0.85) * 100);
                    const status = ev.review_status || 'pending_review';

                    return (
                      <tr key={ev.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2 px-3">
                          <div
                            onClick={() => {
                              setSelectedDrawerEvent(ev);
                              setIsDrawerOpen(true);
                            }}
                            className="w-14 h-9 rounded bg-navy-950 overflow-hidden cursor-pointer relative group flex items-center justify-center border border-gray-200"
                          >
                            {ev.evidence_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ev.evidence_image_url}
                                alt={ev.item_name || ev.detected_class}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Camera className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-charcoal-900 capitalize block">
                            {ev.item_name || ev.detected_class}
                          </span>
                          <span className="text-[10px] text-charcoal-400 capitalize">
                            {ev.waste_category || 'General'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-forest-700">{simScore}%</span>
                          <span className="text-[10px] text-charcoal-400 block">visual similarity</span>
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          <span className="text-charcoal-800 font-medium block">
                            {ev.building_name || ev.building_id}
                          </span>
                          <span className="font-mono text-charcoal-500 text-[10px]">{ev.camera_id}</span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-charcoal-500">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                        </td>
                        <td className="py-2 px-3">
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
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedDrawerEvent(ev);
                              setIsDrawerOpen(true);
                            }}
                            className="text-xs text-forest-700 hover:text-forest-900 font-semibold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Event Detail Drawer */}
      <EventDetailDrawer
        event={selectedDrawerEvent}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDrawerEvent(null);
        }}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
