'use client';

import React, { useState, useEffect } from 'react';
import { FollowUp, Building, BuildingId, Alert } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HelpCircle,
  Building2,
  Calendar,
  User,
  History,
  ShieldCheck,
} from 'lucide-react';

interface FollowUpsViewProps {
  buildings: Building[];
  alerts: Alert[];
  initialAlertId?: string;
  initialBuildingId?: BuildingId;
  initialRecommendationId?: string;
  onFollowUpLogged?: () => void;
  onClearInitialContext?: () => void;
}

export function FollowUpsView({
  buildings,
  alerts,
  initialAlertId,
  initialBuildingId,
  initialRecommendationId,
  onFollowUpLogged,
  onClearInitialContext,
}: FollowUpsViewProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId>(
    initialBuildingId || 'engineering'
  );
  const [selectedAlertId, setSelectedAlertId] = useState<string>(initialAlertId || '');
  const [selectedRecId, setSelectedRecId] = useState<string>(initialRecommendationId || '');
  const [verifierName, setVerifierName] = useState('Dr. Marcus Vance');
  const [role, setRole] = useState('Certified Energy Auditor (CEM)');
  const [preReading, setPreReading] = useState('68.4 kWh/hr (Spiking above baseline)');
  const [postReading, setPostReading] = useState('12.2 kWh/hr (Nominal night setback)');
  const [status, setStatus] = useState<FollowUp['status']>('verified_improved');
  const [notes, setNotes] = useState(
    'Inspected Zone B rooftop air handler. BMS damper schedule was restored to automatic setback. Verified submeter reading via SCADA console over a 45-minute stabilization window.'
  );

  useEffect(() => {
    if (initialBuildingId) setSelectedBuildingId(initialBuildingId);
    if (initialAlertId) {
      setSelectedAlertId(initialAlertId);
      const matchedAlert = alerts.find((a) => a.id === initialAlertId);
      if (matchedAlert && matchedAlert.supportingReadings && matchedAlert.supportingReadings.length > 0) {
        setPreReading(
          `${matchedAlert.supportingReadings[0].metric}: ${matchedAlert.supportingReadings[0].value} (${matchedAlert.supportingReadings[0].deviation})`
        );
        setPostReading(
          `${matchedAlert.supportingReadings[0].metric}: ${matchedAlert.supportingReadings[0].normalRange} (Stabilized)`
        );
      }
    }
    if (initialRecommendationId) setSelectedRecId(initialRecommendationId);
  }, [initialAlertId, initialBuildingId, initialRecommendationId, alerts]);

  const fetchFollowUps = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getFollowUps();
      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setFollowUps(res.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch follow-ups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || !preReading.trim() || !postReading.trim()) {
      setErrorMessage('Please fill in pre-reading, post-reading, and verification notes.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const building = buildings.find((b) => b.id === selectedBuildingId);
    const buildingName = building ? building.name : 'Engineering Block';

    try {
      const res = await apiClient.createFollowUp({
        alertId: selectedAlertId || undefined,
        recommendationId: selectedRecId || undefined,
        buildingId: selectedBuildingId,
        buildingName,
        verifierName,
        role,
        preReading,
        postReading,
        status,
        notes,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setSuccessMessage(
          `Verification record ${res.data.id} logged. Alert and building health score automatically updated.`
        );
        setFollowUps((prev) => [res.data!, ...prev]);

        if (onFollowUpLogged) {
          onFollowUpLogged();
        }
        if (onClearInitialContext) {
          onClearInitialContext();
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOutcomeBadge = (outcome: FollowUp['status']) => {
    switch (outcome) {
      case 'verified_improved':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Verified Improved (Resolved)
          </span>
        );
      case 'requires_rework':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-semibold flex items-center gap-1">
            <RotateCcw className="h-3 w-3 text-rose-600" />
            Requires Re-Work (Active)
          </span>
        );
      case 'inconclusive':
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-amber-600" />
            Inconclusive (Monitoring)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-5">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-forest-700" />
          <h2 className="text-sm font-bold text-charcoal-900">
            Follow-Up Telemetry Verification & Audit Closure
          </h2>
        </div>
        <p className="text-xs text-charcoal-500 mt-0.5 max-w-3xl">
          Close the loop on sustainability anomalies. Log pre- and post-intervention telemetry readings to formally verify efficiency improvements.
          Selecting &ldquo;Verified Improved&rdquo; updates the alert status to resolved and boosts the campus health score.
        </p>
      </div>

      {/* Linked Context Notice */}
      {(initialAlertId || initialRecommendationId) && (
        <div className="p-3 rounded bg-forest-50 border border-forest-200 flex items-center justify-between text-xs">
          <span className="text-forest-900 font-medium">
            Linking verification to: <strong>{initialAlertId || initialRecommendationId}</strong> ({selectedBuildingId})
          </span>
          {onClearInitialContext && (
            <button
              onClick={onClearInitialContext}
              className="text-charcoal-500 hover:text-charcoal-800 underline text-[11px]"
            >
              Clear Preselection
            </button>
          )}
        </div>
      )}

      {errorMessage && <ErrorBanner message={errorMessage} onRetry={fetchFollowUps} />}
      {successMessage && (
        <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Form on Left */}
        <div className="lg:col-span-5 card-clean p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-charcoal-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-forest-700" />
              Log Audit Verification
            </h3>
            <Badge variant="simulated">SCADA Gate</Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Target Facility */}
            <div>
              <label className="block text-charcoal-600 font-medium mb-1">Target Facility</label>
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value as BuildingId)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Anomaly */}
            <div>
              <label className="block text-charcoal-600 font-medium mb-1">Link to Active Anomaly (Optional)</label>
              <select
                value={selectedAlertId}
                onChange={(e) => setSelectedAlertId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
              >
                <option value="">None / Standalone Audit</option>
                {alerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} - {a.title} ({a.buildingName})
                  </option>
                ))}
              </select>
            </div>

            {/* Pre and Post Readings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Pre-Intervention Reading</label>
                <input
                  type="text"
                  value={preReading}
                  onChange={(e) => setPreReading(e.target.value)}
                  placeholder="e.g. 68.4 kWh/hr (Spiking)"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs font-mono focus:outline-none focus:border-forest-600"
                  required
                />
              </div>

              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Post-Intervention Reading</label>
                <input
                  type="text"
                  value={postReading}
                  onChange={(e) => setPostReading(e.target.value)}
                  placeholder="e.g. 12.2 kWh/hr (Normalized)"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs font-mono focus:outline-none focus:border-forest-600"
                  required
                />
              </div>
            </div>

            {/* Verifier & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Verifier Name</label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
                  required
                />
              </div>

              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Professional Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
                  required
                />
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="block text-charcoal-600 font-medium mb-1">Verification Status Outcome</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FollowUp['status'])}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
              >
                <option value="verified_improved">Verified Improved (Resolves linked alert)</option>
                <option value="inconclusive">Inconclusive (Continue monitoring)</option>
                <option value="requires_rework">Requires Re-work (Re-open alert)</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-charcoal-600 font-medium mb-1">Auditor Technical Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Explain the physical verification method, instruments used, duration of telemetry sampling..."
                className="w-full bg-white border border-gray-300 rounded p-2.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 rounded bg-forest-800 hover:bg-forest-900 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" /> Committing Verification...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Commit Follow-Up & Close Anomaly
                </>
              )}
            </button>
          </form>
        </div>

        {/* Audit Trail List on Right */}
        <div className="lg:col-span-7 card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-forest-700" />
                <h3 className="text-xs font-bold text-charcoal-900">
                  Verification Audit Trail ({followUps.length})
                </h3>
              </div>
              <span className="text-xs text-charcoal-400 font-mono">Official Campus Records</span>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : followUps.length === 0 ? (
              <div className="py-12 text-center text-xs text-charcoal-500">
                No follow-up verifications recorded yet.
              </div>
            ) : (
              <div className="space-y-3 mt-3.5 max-h-[580px] overflow-y-auto pr-1">
                {followUps.map((fol) => (
                  <div
                    key={fol.id}
                    className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-charcoal-900 font-bold text-xs">{fol.id}</span>
                          <span className="text-xs font-semibold text-charcoal-800">{fol.buildingName}</span>
                          {fol.alertId && (
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-charcoal-600 border border-gray-200">
                              Linked: {fol.alertId}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-charcoal-400 mt-0.5">
                          {new Date(fol.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div>{getOutcomeBadge(fol.status)}</div>
                    </div>

                    {/* Pre vs Post Comparison Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded bg-white border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] text-rose-700 uppercase font-bold block">Pre-Reading</span>
                        <span className="font-mono text-charcoal-900 font-bold">{fol.preReading}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-forest-800 uppercase font-bold block">Post-Reading</span>
                        <span className="font-mono text-charcoal-900 font-bold">{fol.postReading}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    <p className="text-xs text-charcoal-700 bg-white p-2.5 rounded border border-gray-200 leading-relaxed">
                      {fol.notes}
                    </p>

                    {/* Sign-off */}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px] text-charcoal-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-charcoal-400" />
                        Verified by: <strong className="text-charcoal-800">{fol.verifierName}</strong> ({fol.role})
                      </span>
                      <span className="text-forest-800 font-mono text-[10px] font-semibold">SCADA Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
