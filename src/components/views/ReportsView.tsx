'use client';

import React, { useState, useEffect } from 'react';
import { SustainabilityReport, Building } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  Code,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { CameraAnalyticsView } from '@/components/views/CameraAnalyticsView';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ReportsViewProps {
  buildings: Building[];
}

export function ReportsView({ buildings }: ReportsViewProps) {
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');

  const timeframeLabels: Record<string, { start: string; end: string; label: string }> = {
    week: {
      start: '2026-10-08',
      end: '2026-10-15',
      label: 'Last 7 Days (Oct 8 - Oct 15, 2026)',
    },
    month: {
      start: '2026-10-01',
      end: '2026-10-15',
      label: 'Month-to-Date (October 2026)',
    },
    quarter: {
      start: '2026-07-01',
      end: '2026-09-30',
      label: 'Q3 Decarbonization Audit',
    },
    year: {
      start: '2026-01-01',
      end: '2026-10-15',
      label: 'Academic Year 2026 YTD',
    },
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const activeRange = timeframeLabels[timeframe];
      const res = await apiClient.generateReport({
        dateRange: activeRange,
        buildingFilter: selectedBuilding,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setReport(res.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [timeframe, selectedBuilding]);

  // Export as CSV
  const handleDownloadCsv = () => {
    if (!report) return;

    const rows = [
      ['Metric', 'Value'],
      ['Report Title', report.title],
      ['Timeframe', report.dateRange.label],
      ['Facility Scope', report.buildingFilter === 'all' ? 'All Campus Facilities' : report.buildingFilter],
      ['Total Energy Conserved (kWh)', report.summary.totalKwhSaved.toString()],
      ['Total Water Conserved (Liters)', report.summary.totalWaterSavedLiters.toString()],
      ['Total Carbon Avoided (tCO2e)', report.summary.totalCo2AvoidedTons.toString()],
      ['Estimated Cost Avoidance', report.summary.estimatedCostSaved],
      ['Resolved Anomalies Count', report.summary.alertsResolvedCount.toString()],
      ['Logged Audit Follow-Ups', report.summary.followUpsLogged.toString()],
      [],
      ['Facility Breakdown'],
      ['Facility ID', 'Name', 'Efficiency Score (%)', 'Electricity (kWh)', 'Water (Liters)', 'Active Alerts'],
      ...report.buildingBreakdown.map((b) => [
        b.buildingId,
        b.buildingName,
        b.efficiencyScore.toString(),
        b.electricityKwh.toString(),
        b.waterLiters.toString(),
        b.activeAlerts.toString(),
      ]),
      [],
      ['Verification Audit Trail'],
      ['Audit ID', 'Verifier', 'Facility', 'Outcome', 'Date'],
      ...report.followUpAuditTrail.map((f) => [f.id, f.verifier, f.building, f.outcome, f.date]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((e) => e.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EcoTwin_Sustainability_Report_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export as JSON
  const handleDownloadJson = () => {
    if (!report) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(report, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `EcoTwin_Report_${report.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const chartData = report?.buildingBreakdown.map((b) => ({
    name: b.buildingName.replace(' Block', '').replace(' Central', ''),
    kwh: b.electricityKwh,
    score: b.efficiencyScore,
  })) || [];

  const [reportSection, setReportSection] = useState<'waste_analytics' | 'decarbonization'>('waste_analytics');

  return (
    <div className="space-y-6">
      {/* Top Section Mode Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setReportSection('waste_analytics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            reportSection === 'waste_analytics'
              ? 'bg-forest-50 text-forest-900 border border-forest-200 shadow-2xs font-bold'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Camera className="h-4 w-4 text-forest-700" />
          <span>Camera Waste Vision Analytics</span>
          <span className="font-mono text-[10px] bg-forest-100 text-forest-800 px-1.5 py-0.2 rounded font-bold">
            Real DB
          </span>
        </button>

        <button
          onClick={() => setReportSection('decarbonization')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            reportSection === 'decarbonization'
              ? 'bg-forest-50 text-forest-900 border border-forest-200 shadow-2xs font-bold'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <FileText className="h-4 w-4 text-forest-700" />
          <span>Decarbonization & ESG Compliance</span>
          <span className="font-mono text-[10px] bg-gray-200 text-charcoal-700 px-1.5 py-0.2 rounded font-semibold">
            SCADA Audit
          </span>
        </button>
      </div>

      {reportSection === 'waste_analytics' ? (
        <CameraAnalyticsView />
      ) : (
        <>
          {/* Header & Export Toolbar */}
          <div className="card-clean p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-forest-700" />
                <h2 className="text-sm font-bold text-charcoal-900">
                  Sustainability Reports & Compliance Audit Export
                </h2>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5 max-w-2xl">
                Generate formal engineering audits aligned with institutional ESG and ASHRAE energy performance frameworks.
              </p>
            </div>

        {/* Working Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!report || isGenerating}
            className="px-3 py-1.5 rounded bg-white hover:bg-gray-100 text-charcoal-800 border border-gray-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-forest-700" />
            Export CSV
          </button>

          <button
            onClick={handleDownloadJson}
            disabled={!report || isGenerating}
            className="px-3 py-1.5 rounded bg-white hover:bg-gray-100 text-charcoal-800 border border-gray-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Code className="h-3.5 w-3.5 text-charcoal-600" />
            Export JSON
          </button>

          <button
            onClick={handlePrint}
            disabled={!report || isGenerating}
            className="px-3.5 py-1.5 rounded bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / PDF Report
          </button>
        </div>
      </div>

      {/* Filter Selector Strip */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-forest-700" />
          <span className="text-xs font-semibold text-charcoal-700">Audit Horizon:</span>
          <div className="flex bg-gray-100 rounded-md p-1 border border-gray-200 text-xs">
            {(['week', 'month', 'quarter', 'year'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded font-medium capitalize transition-all ${
                  timeframe === t
                    ? 'bg-white text-forest-800 font-bold border border-gray-300 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Building2 className="h-4 w-4 text-charcoal-400" />
          <span className="text-charcoal-500 font-medium">Facility Scope:</span>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="bg-white border border-gray-300 rounded px-2.5 py-1 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
          >
            <option value="all">Entire Campus Portfolio</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} onRetry={generateReport} />}

      {isLoading || isGenerating ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
          <LoadingSpinner size="lg" />
          <span className="text-xs text-charcoal-500">Synthesizing institutional audit payload...</span>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Executive Summary Report Card */}
          <div className="card-clean p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
              <div>
                <span className="text-[10px] font-mono text-forest-800 uppercase tracking-wider font-bold">
                  Official Verification Record • {report.id}
                </span>
                <h3 className="text-base font-bold text-charcoal-900 mt-0.5">{report.title}</h3>
                <p className="text-xs text-charcoal-400 font-mono">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <Badge variant="simulated">SCADA Aggregated</Badge>
            </div>

            {/* Top 6 Impact Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Cost Avoidance</span>
                <div className="text-base font-bold font-mono text-forest-800 mt-1">
                  {report.summary.estimatedCostSaved}
                </div>
              </div>

              <div className="p-3.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Energy Conserved</span>
                <div className="text-base font-bold font-mono text-charcoal-900 mt-1">
                  {report.summary.totalKwhSaved.toLocaleString()} <span className="text-xs font-normal">kWh</span>
                </div>
              </div>

              <div className="p-3.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Water Saved</span>
                <div className="text-base font-bold font-mono text-sky-800 mt-1">
                  {report.summary.totalWaterSavedLiters.toLocaleString()} <span className="text-xs font-normal">L</span>
                </div>
              </div>

              <div className="p-3.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Carbon Avoided</span>
                <div className="text-base font-bold font-mono text-emerald-800 mt-1">
                  {report.summary.totalCo2AvoidedTons} <span className="text-xs font-normal">tCO2e</span>
                </div>
              </div>

              <div className="p-3.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Anomalies Resolved</span>
                <div className="text-base font-bold font-mono text-charcoal-900 mt-1">
                  {report.summary.alertsResolvedCount}
                </div>
              </div>

              <div className="p-3.5 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Follow-Ups Logged</span>
                <div className="text-base font-bold font-mono text-charcoal-900 mt-1">
                  {report.summary.followUpsLogged}
                </div>
              </div>
            </div>

            {/* Building Breakdown Table & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-gray-100">
              <div className="lg:col-span-7">
                <h4 className="text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-2.5">
                  Building Portfolio Performance Breakdown
                </h4>
                <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-charcoal-500 border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Facility</th>
                        <th className="py-2.5 px-3 font-semibold">Health Score</th>
                        <th className="py-2.5 px-3 font-semibold">Electricity</th>
                        <th className="py-2.5 px-3 font-semibold">Water</th>
                        <th className="py-2.5 px-3 font-semibold">Open Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.buildingBreakdown.map((b) => (
                        <tr key={b.buildingId}>
                          <td className="py-2 px-3 font-medium text-charcoal-900">{b.buildingName}</td>
                          <td className="py-2 px-3 font-mono font-bold text-forest-800">
                            {b.efficiencyScore}%
                          </td>
                          <td className="py-2 px-3 font-mono text-charcoal-700">{b.electricityKwh} kWh</td>
                          <td className="py-2 px-3 font-mono text-charcoal-700">
                            {b.waterLiters.toLocaleString()} L
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`font-semibold ${
                                b.activeAlerts > 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {b.activeAlerts}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mini Demand Profile Bar Chart */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-2.5">
                  Demand Profile by Building (kWh)
                </h4>
                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '6px',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="kwh" name="kWh Demand" fill="#164E3D" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Key Recommendations & Audit Trail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="p-4 rounded bg-gray-50/70 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-charcoal-900 block">
                  Priority Decarbonization Protocols
                </span>
                <ul className="space-y-1.5 text-xs text-charcoal-600 list-disc list-inside">
                  {report.keyRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded bg-gray-50/70 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-charcoal-900 block">
                  Recent Verified Audit Sign-Offs
                </span>
                <div className="space-y-2 text-xs">
                  {report.followUpAuditTrail.slice(0, 3).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded bg-white border border-gray-200"
                    >
                      <div>
                        <span className="font-semibold text-charcoal-800">{f.building}</span>
                        <span className="text-[10px] text-charcoal-400 block font-mono">
                          Verified by {f.verifier} on {f.date}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {f.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>
      )}
    </div>
  );
}
