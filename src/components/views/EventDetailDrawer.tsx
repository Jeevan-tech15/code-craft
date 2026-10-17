'use client';

import React, { useState } from 'react';
import { CameraEvent } from '@/types';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  Camera,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  HelpCircle,
  FileText,
  Tag,
  Maximize2,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface EventDetailDrawerProps {
  event: CameraEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (
    eventId: string,
    newStatus: 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved',
    notes?: string
  ) => Promise<void>;
  onAskAgent?: (event: CameraEvent) => void;
}

// Waste segregation guidance dictionary (clearly marked as general institutional guidance)
const WASTE_GUIDANCE: Record<string, { bin: string; color: string; advice: string }> = {
  plastic: {
    bin: 'Plastics & Polymers Receptacle (Yellow / Blue)',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    advice:
      'Ensure bottles and containers are emptied of liquids. Lightly rinse if contaminated with food residue. Check for campus recyclable resin codes #1 (PET) and #2 (HDPE).',
  },
  paper: {
    bin: 'Paper & Clean Cardboard Bin (Blue)',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    advice:
      'Keep dry and flatten cartons to conserve bin volume. Soiled food-grease paper or waxed wrappers should be diverted to general waste to avoid contamination of the recycling pulper.',
  },
  metal: {
    bin: 'Metals & Aluminium Cans Receptacle (Grey / Red)',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    advice:
      'Drain all residual liquid. Beverage cans and foil containers are 100% recyclable with indefinite lifecycle efficiency.',
  },
  organic: {
    bin: 'Organics & Composting Hopper (Green)',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    advice:
      'Food scraps, tea bags, and fruit peels only. Do not discard plastic wrappers or bioplastics unless certified compostable by campus facility management.',
  },
  electronic: {
    bin: 'Designated E-Waste Drop-off Vault',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    advice:
      'High-priority disposal protocol: Do not place in standard recycling. Deliver to the Engineering Hardware Facility or Central IT e-waste kiosk for hazardous metals recovery.',
  },
  hazardous: {
    bin: 'Hazardous Chemical / Battery Safe-Deposit',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    advice:
      'Specialized containment required. Contact Campus Environmental Health & Safety (EHS) dispatch immediately. Do not compress or expose to moisture.',
  },
  general: {
    bin: 'General Landfill / Non-Recyclable Receptacle (Black)',
    color: 'text-charcoal-700 bg-charcoal-50 border-charcoal-200',
    advice:
      'Non-recyclable mixed materials, composite multi-layer packaging, or contaminated items unable to be separated at source.',
  },
};

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  event,
  isOpen,
  onClose,
  onUpdateStatus,
  onAskAgent,
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const categoryKey = (event.waste_category || 'general').toLowerCase();
  const guidance = WASTE_GUIDANCE[categoryKey] || WASTE_GUIDANCE.general;

  const rawEventDate = event.detected_at || event.timestamp;
  const eventDate = rawEventDate ? new Date(rawEventDate) : new Date();
  const formattedDate = eventDate.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const similarityPercent =
    event.similarity_score !== undefined
      ? Math.round(event.similarity_score * 100)
      : Math.round((event.confidence || 0.85) * 100);

  const currentStatus = event.review_status || 'pending_review';

  const handleStatusChange = async (
    newStatus: 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved'
  ) => {
    if (!onUpdateStatus) return;
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      await onUpdateStatus(event.id, newStatus, reviewNotes);
      setUpdateSuccess(`Status updated to ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setUpdateSuccess(null), 3500);
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update review status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-950/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 overflow-hidden"
        role="dialog"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-forest-50 border border-forest-200 text-forest-700">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="drawer-title" className="text-sm font-bold text-charcoal-900">
                  Evidence Detail & Verification
                </h3>
                <span className="font-mono text-xs text-charcoal-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {event.event_code || event.id.substring(0, 8)}
                </span>
              </div>
              <p className="text-xs text-charcoal-500">
                Teach-and-remember visual memory match snapshot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-gray-200/60 transition-colors"
            aria-label="Close detail drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-charcoal-700">
          {/* Actual Evidence Image Preview */}
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-navy-950/5">
            <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-[11px] text-charcoal-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-forest-600" />
                Actual Captured Frame Evidence
              </span>
              <span className="text-charcoal-400 font-mono text-[10px]">
                {event.evidence_storage_path ? 'Supabase Storage' : 'Local Capture'}
              </span>
            </div>

            <div className="relative aspect-video bg-navy-950 flex items-center justify-center overflow-hidden">
              {event.evidence_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.evidence_image_url}
                  alt={`Evidence frame for ${event.item_name || event.detected_class}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = document.getElementById(`evidence-fallback-${event.id}`);
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}

              <div
                id={`evidence-fallback-${event.id}`}
                className={`p-6 text-center text-slate-300 ${
                  event.evidence_image_url ? 'hidden' : 'flex flex-col items-center justify-center'
                }`}
              >
                <Camera className="h-10 w-10 text-slate-500 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-slate-200">No Image Evidence Available</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  This detection event was recorded without an accessible snapshot path, or the
                  network bucket was offline during camera capture.
                </p>
              </div>

              {/* Bounding box indicator badge */}
              {event.item_name && (
                <div className="absolute top-2 left-2 bg-navy-900/85 backdrop-blur-sm border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded text-[11px] font-mono shadow-sm">
                  {event.item_name} • {similarityPercent}% match
                </div>
              )}
            </div>

            {/* Storage path footer */}
            {event.evidence_storage_path && (
              <div className="p-2 bg-gray-50 text-[10px] text-charcoal-500 font-mono truncate border-t border-gray-100 flex items-center justify-between">
                <span className="truncate">Path: {event.evidence_storage_path}</span>
                {event.evidence_image_url && (
                  <a
                    href={event.evidence_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest-600 hover:text-forest-700 flex items-center gap-0.5 ml-2 whitespace-nowrap"
                  >
                    Open original <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Core Detection Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-0.5">
                Taught Item Name
              </span>
              <span className="text-sm font-bold text-charcoal-900 capitalize">
                {event.item_name || event.detected_class}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-0.5">
                Waste Category
              </span>
              <span className="text-sm font-bold text-charcoal-900 capitalize">
                {event.waste_category || 'General'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] font-medium text-charcoal-500 uppercase tracking-wider block mb-0.5">
                Visual Similarity
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-forest-700 font-mono">
                  {similarityPercent}%
                </span>
                <span className="text-[10px] text-charcoal-500">similarity</span>
              </div>
            </div>
          </div>

          {/* Visual Memory Similarity Disclosure */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-950">
              <Info className="h-3.5 w-3.5 text-amber-700" />
              <span>Visual Similarity Score vs. Calibrated Probability</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This match is computed by the live <strong>teach-and-remember visual memory</strong>{' '}
              matcher using SIFT keypoint descriptor distance and planar homography. It represents
              visual similarity to taught reference snapshots, <strong>not</strong> calibrated AI
              probability or proof of generalized object recognition.
            </p>
          </div>

          {/* Object Presence vs. Litter Disclosure */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
              <AlertTriangle className="h-3.5 w-3.5 text-slate-600" />
              <span>Object Visibility vs. Waste Management Anomaly</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Detecting an object in the camera view indicates visual presence, not proof of litter,
              misplacement, contamination, or environmental violation. Only mark as an actionable
              waste issue when campus rules or physical inspection confirms improper disposal.
            </p>
          </div>

          {/* Location & Shared Physical Hardware Attribution */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5">
            <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-forest-600" />
              Campus Location & Hardware Attribution
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-charcoal-500 block text-[11px]">Building:</span>
                <span className="font-semibold text-charcoal-900">
                  {event.building_name || event.building_id}
                </span>
              </div>

              <div>
                <span className="text-charcoal-500 block text-[11px]">Zone / Classroom:</span>
                <span className="font-semibold text-charcoal-900">
                  {event.zone || 'Zone not configured'}
                </span>
                {!event.zone && (
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    Configure zone in public.logical_cameras
                  </span>
                )}
              </div>

              <div>
                <span className="text-charcoal-500 block text-[11px]">Logical Camera Profile:</span>
                <span className="font-semibold text-charcoal-900 font-mono">
                  {event.camera_id}
                </span>
              </div>

              <div>
                <span className="text-charcoal-500 block text-[11px]">Physical Sensor Hardware:</span>
                <span className="font-medium text-charcoal-700">
                  Laptop Webcam (Shared across 4 profiles)
                </span>
              </div>

              <div>
                <span className="text-charcoal-500 block text-[11px]">Timestamp:</span>
                <span className="font-medium text-charcoal-700">
                  {formattedDate} at {formattedTime}
                </span>
              </div>

              <div>
                <span className="text-charcoal-500 block text-[11px]">Matcher Engine:</span>
                <span className="font-mono text-charcoal-700">
                  {event.model_name || 'teach-and-remember-sift:v1.0'}
                </span>
              </div>
            </div>

            {event.match_inliers !== undefined && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-charcoal-500">
                <span>Homography Inlier Points:</span>
                <span className="font-mono font-bold text-charcoal-800">
                  {event.match_inliers} verified inliers
                </span>
              </div>
            )}
          </div>

          {/* Practical Campus Waste Segregation Guidance */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-forest-600" />
                Segregation & Disposal Protocol
              </h4>
              <span className="text-[10px] text-charcoal-400 italic">General Guidance</span>
            </div>

            <div className={`p-3 rounded-lg border text-xs ${guidance.color} space-y-1`}>
              <div className="font-semibold flex items-center gap-1.5">
                <span>Target Receptacle:</span>
                <span>{guidance.bin}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{guidance.advice}</p>
            </div>
            <p className="text-[10px] text-charcoal-400">
              * Note: Segregation procedures reflect standard campus sustainability guidelines.
              Refer to building facilities coordinator for specialized laboratory disposal policies.
            </p>
          </div>

          {/* Review & Verification Audit Controls */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-600" />
                Audit Review & Verification
              </h4>
              <Badge
                variant={
                  currentStatus === 'verified_waste'
                    ? 'critical'
                    : currentStatus === 'resolved'
                    ? 'normal'
                    : currentStatus === 'false_positive'
                    ? 'low'
                    : 'warning'
                }
              >
                {currentStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-charcoal-600 mb-1">
                Audit Reviewer Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document verification findings, custodial action, or reason for status change..."
                rows={2}
                className="w-full text-xs rounded border border-gray-300 p-2 text-charcoal-900 focus:outline-none focus:border-forest-600 placeholder-charcoal-400"
              />
            </div>

            {updateSuccess && (
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {updateSuccess}
              </div>
            )}

            {updateError && (
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                {updateError}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                disabled={isUpdating || currentStatus === 'verified_waste'}
                onClick={() => handleStatusChange('verified_waste')}
                className="px-2.5 py-1.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-colors"
              >
                Confirm Waste
              </button>

              <button
                disabled={isUpdating || currentStatus === 'false_positive'}
                onClick={() => handleStatusChange('false_positive')}
                className="px-2.5 py-1.5 rounded text-[11px] font-semibold bg-gray-50 text-charcoal-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                False Positive
              </button>

              <button
                disabled={isUpdating || currentStatus === 'resolved'}
                onClick={() => handleStatusChange('resolved')}
                className="px-2.5 py-1.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                Mark Cleared
              </button>

              <button
                disabled={isUpdating || currentStatus === 'pending_review'}
                onClick={() => handleStatusChange('pending_review')}
                className="px-2.5 py-1.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                Reopen
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between gap-3">
          {onAskAgent && (
            <button
              onClick={() => {
                onAskAgent(event);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-50 border border-cyan-200 text-cyan-800 hover:bg-cyan-100 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
              Ask EcoPilot about this Detection
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-medium text-charcoal-700 hover:bg-gray-200/70 border border-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
