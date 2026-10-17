'use client';

import React, { useState, useEffect } from 'react';
import { SustainabilityRecommendation, BuildingId } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  Lightbulb,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  FileCheck,
  Bot,
  Filter,
  Calendar,
  User,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface RecommendationsViewProps {
  onScheduleFollowUp: (alertId?: string, buildingId?: BuildingId, recommendationId?: string) => void;
  onAskEcoPilot: (prompt: string, buildingId?: BuildingId) => void;
}

export function RecommendationsView({
  onScheduleFollowUp,
  onAskEcoPilot,
}: RecommendationsViewProps) {
  const [recommendations, setRecommendations] = useState<SustainabilityRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getRecommendations();
      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setRecommendations(res.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleAdvanceStatus = async (
    id: string,
    currentStatus: SustainabilityRecommendation['status']
  ) => {
    const nextStatusMap: Record<
      SustainabilityRecommendation['status'],
      SustainabilityRecommendation['status']
    > = {
      todo: 'in_progress',
      in_progress: 'verified',
      verified: 'completed',
      completed: 'todo',
    };

    const nextStatus = nextStatusMap[currentStatus];
    setUpdatingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.updateRecommendationStatus(id, nextStatus);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? res.data! : r))
        );
        setSuccessMessage(`Action milestone ${id} updated to ${nextStatus.replace('_', ' ')}.`);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRecs = recommendations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    return true;
  });

  const totalCostSavings = recommendations.reduce((acc, r) => {
    const num = parseInt(r.projectedSavings.costSavingsMonthly?.replace(/\D/g, '') || '0', 10);
    return acc + num;
  }, 0);

  const totalKwhSavings = recommendations.reduce((acc, r) => acc + (r.projectedSavings.kwh || 0), 0);
  const totalWaterSavings = recommendations.reduce((acc, r) => acc + (r.projectedSavings.waterLiters || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Aggregate Savings Row */}
      <div className="card-clean p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-forest-700" />
              <h2 className="text-sm font-bold text-charcoal-900">
                Campus Decarbonization Roadmap & Verified Action Plan
              </h2>
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5 max-w-3xl">
              Engineered conservation protocols prioritized by estimated ROI and payback velocity.
              Track implementation progress from planning to official audit sign-off.
            </p>
          </div>

          <Badge variant="simulated">ASHRAE 90.1 Pipeline</Badge>
        </div>

        {/* Aggregate Savings Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Monthly Cost Avoidance</span>
            <div className="text-base font-bold font-mono text-forest-800 mt-0.5">
              ${totalCostSavings.toLocaleString()}/mo
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Annual Energy Conserved</span>
            <div className="text-base font-bold font-mono text-charcoal-900 mt-0.5">
              {(totalKwhSavings * 12).toLocaleString()} kWh/yr
            </div>
          </div>

          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">Water Conservation Yield</span>
            <div className="text-base font-bold font-mono text-sky-800 mt-0.5">
              {totalWaterSavings.toLocaleString()} Liters/mo
            </div>
          </div>
        </div>
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} onRetry={fetchRecommendations} />}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Pipeline Toolbar */}
      <div className="card-clean p-3 flex flex-wrap items-center justify-between gap-4">
        {/* Status Pipeline Tabs */}
        <div className="flex bg-gray-100 rounded-md p-1 border border-gray-200 text-xs">
          {(['all', 'todo', 'in_progress', 'verified', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white text-forest-800 font-bold border border-gray-300 shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-charcoal-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded px-2.5 py-1 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
          >
            <option value="all">All Domains</option>
            <option value="energy">Energy & Solar</option>
            <option value="water">Hydronics & Water</option>
            <option value="waste">Waste & Recycling</option>
            <option value="carbon">Carbon Decarbonization</option>
            <option value="hvac">HVAC Automation</option>
          </select>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="card-clean p-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
          <h4 className="text-xs font-bold text-charcoal-900">No recommendations match the filter</h4>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Switch filter settings to view open or completed roadmap milestones.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecs.map((rec) => (
            <div
              key={rec.id}
              className="card-clean p-5 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-all"
            >
              <div className="space-y-3">
                {/* Top strip */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={rec.priority}>{rec.priority}</Badge>
                      <Badge variant={rec.status}>{rec.status.replace('_', ' ')}</Badge>
                      {rec.isAiGenerated ? (
                        <span className="px-2 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200 text-[10px] font-semibold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-forest-700" />
                          AI Synthesis
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-charcoal-600 border border-gray-200 text-[10px] font-semibold">
                          Rule-Based Protocol
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-charcoal-900 mt-2">{rec.title}</h3>
                    <div className="text-[11px] text-charcoal-500">
                      {rec.buildingName} • Payback: <strong className="text-forest-800 font-semibold">{rec.paybackPeriod}</strong>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-charcoal-600 leading-relaxed">{rec.description}</p>

                {/* Savings Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded bg-gray-50 border border-gray-200 text-xs">
                  {rec.projectedSavings.costSavingsMonthly && (
                    <div>
                      <span className="text-[10px] text-charcoal-500 block">Est. Cost Savings</span>
                      <span className="font-bold text-forest-800 font-mono">
                        {rec.projectedSavings.costSavingsMonthly}
                      </span>
                    </div>
                  )}
                  {rec.projectedSavings.kwh && (
                    <div>
                      <span className="text-[10px] text-charcoal-500 block">Energy Avoided</span>
                      <span className="font-bold text-charcoal-900 font-mono">
                        {rec.projectedSavings.kwh.toLocaleString()} kWh
                      </span>
                    </div>
                  )}
                  {rec.projectedSavings.waterLiters && (
                    <div>
                      <span className="text-[10px] text-charcoal-500 block">Water Conserved</span>
                      <span className="font-bold text-sky-800 font-mono">
                        {rec.projectedSavings.waterLiters.toLocaleString()} L
                      </span>
                    </div>
                  )}
                  {rec.projectedSavings.co2eTons && (
                    <div>
                      <span className="text-[10px] text-charcoal-500 block">Carbon Reduction</span>
                      <span className="font-bold text-emerald-800 font-mono">
                        {rec.projectedSavings.co2eTons} tCO2e
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-charcoal-500 block">Complexity</span>
                    <span className="font-semibold text-charcoal-800">{rec.difficulty}</span>
                  </div>
                </div>

                {/* Implementation Steps */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-charcoal-700 block">Implementation Checklist:</span>
                  <ul className="space-y-1 text-xs text-charcoal-600 list-disc list-inside">
                    {rec.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>

                {/* Verification Criteria */}
                <div className="p-2.5 rounded bg-white border border-gray-200 text-[11px] text-charcoal-700">
                  <span className="font-bold text-charcoal-900">Verification Criteria: </span>
                  {rec.verificationCriteria}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-charcoal-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-charcoal-400" />
                    Assignee: <strong className="text-charcoal-800">{rec.assignee}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-charcoal-400" />
                    Due: {rec.deadline}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() =>
                      onAskEcoPilot(`Assist in implementing protocol: "${rec.title}" at ${rec.buildingName}`, rec.buildingId)
                    }
                    className="text-xs text-forest-700 hover:text-forest-900 font-semibold flex items-center gap-1"
                  >
                    <Bot className="h-3.5 w-3.5" /> Ask EcoPilot
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onScheduleFollowUp(undefined, rec.buildingId, rec.id)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 text-charcoal-800 text-xs font-semibold border border-gray-300 flex items-center gap-1.5 shadow-xs"
                    >
                      <FileCheck className="h-3.5 w-3.5 text-emerald-700" />
                      Verify Outcome
                    </button>

                    <button
                      onClick={() => handleAdvanceStatus(rec.id, rec.status)}
                      disabled={updatingId === rec.id}
                      className="px-3 py-1 rounded bg-forest-800 hover:bg-forest-900 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all"
                    >
                      {updatingId === rec.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <span>Advance</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
