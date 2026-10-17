'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Inspection, Building, BuildingId } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  EyeOff,
  Building2,
  FileText,
  User,
  X,
  History,
} from 'lucide-react';

interface InspectionsViewProps {
  buildings: Building[];
}

export function InspectionsView({ buildings }: InspectionsViewProps) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId>('engineering');
  const [zone, setZone] = useState('Zone B - Rooftop Mechanical Deck');
  const [equipmentTag, setEquipmentTag] = useState('AHU-ENG-02B');
  const [inspectorName, setInspectorName] = useState('Sarah Jenkins, PE');
  const [role, setRole] = useState('Senior Commissioning Engineer');
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInspections = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getInspections();
      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setInspections(res.data);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch inspections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImageFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMessage('Please provide observational notes before logging this inspection.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const building = buildings.find((b) => b.id === selectedBuildingId);
    const buildingName = building ? building.name : 'Engineering Block';

    try {
      const res = await apiClient.createInspection({
        buildingId: selectedBuildingId,
        buildingName,
        zone,
        equipmentTag,
        inspectorName,
        role,
        notes,
        imageUrl: imagePreview || undefined,
      });

      if (res.error) {
        setErrorMessage(res.error.message);
      } else if (res.data) {
        setSuccessMessage(`Inspection record ${res.data.id} logged successfully.`);
        setNotes('');
        handleClearImage();
        setInspections((prev) => [res.data!, ...prev]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-5">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-forest-700" />
          <h2 className="text-sm font-bold text-charcoal-900">
            Physical Facility Inspections & Visual Evidence
          </h2>
        </div>
        <p className="text-xs text-charcoal-500 mt-0.5 max-w-3xl">
          Log on-site visual checks, photograph physical dampers/inverters/meters, and record maintenance verification.
          Vision AI analysis is only triggered when live multimodal models are active; otherwise it is explicitly labeled as Unavailable.
        </p>
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} onRetry={fetchInspections} />}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Upload Form on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-5 card-clean p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-charcoal-900 flex items-center gap-2">
              <Upload className="h-4 w-4 text-forest-700" />
              Log New Facility Inspection
            </h3>
            <Badge variant="simulated">Facility Verification</Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Facility & Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Physical Zone / Deck</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
                  placeholder="e.g. Zone B Mechanical Deck"
                  required
                />
              </div>
            </div>

            {/* Equipment Tag & Inspector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Equipment Tag</label>
                <input
                  type="text"
                  value={equipmentTag}
                  onChange={(e) => setEquipmentTag(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs font-mono focus:outline-none focus:border-forest-600"
                  placeholder="e.g. AHU-ENG-02B"
                  required
                />
              </div>

              <div>
                <label className="block text-charcoal-600 font-medium mb-1">Inspector Name</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
                  required
                />
              </div>
            </div>

            {/* Photo Upload & Preview */}
            <div>
              <label className="block text-charcoal-600 font-medium mb-1">Photo Evidence Attachment</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="inspection-file-input"
              />

              {!imagePreview ? (
                <label
                  htmlFor="inspection-file-input"
                  className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <Camera className="h-6 w-6 text-charcoal-400 mb-1.5" />
                  <span className="text-xs font-semibold text-charcoal-700">
                    Click to browse or drop equipment photo
                  </span>
                  <span className="text-[11px] text-charcoal-400 mt-0.5">
                    Supports JPG, PNG, WebP up to 10MB
                  </span>
                </label>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2">
                  <img
                    src={imagePreview}
                    alt="Inspection Preview"
                    className="w-full h-40 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute top-4 right-4 p-1 rounded-full bg-gray-900/80 text-white hover:bg-gray-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="text-[11px] text-charcoal-600 mt-1.5 px-1 flex justify-between">
                    <span className="truncate">{imageFileName}</span>
                    <span className="text-forest-700 font-medium">Ready</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-charcoal-600 font-medium mb-1">Audit Findings & Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Describe observations, physical damper position, signs of seal failure..."
                className="w-full bg-white border border-gray-300 rounded p-2.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
                required
              />
            </div>

            {/* Vision AI Disclaimer requirement */}
            <div className="p-2.5 rounded bg-gray-50 border border-gray-200 text-[11px] text-charcoal-500 flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-charcoal-400 flex-shrink-0" />
              <span>
                Note: Computer vision analysis displays as <strong>&ldquo;Unavailable&rdquo;</strong> unless an external vision model endpoint is active.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 rounded bg-forest-800 hover:bg-forest-900 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" /> Logging Record...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Log Facility Inspection Record
                </>
              )}
            </button>
          </form>
        </div>

        {/* Inspections History Feed on Right */}
        <div className="lg:col-span-7 card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-forest-700" />
                <h3 className="text-xs font-bold text-charcoal-900">
                  Inspection History & Audit Trail ({inspections.length})
                </h3>
              </div>
              <span className="text-xs text-charcoal-400 font-mono">Chronological Logs</span>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="py-12 text-center text-xs text-charcoal-500">
                No inspections recorded yet. Submit your first observation using the form on the left.
              </div>
            ) : (
              <div className="space-y-3 mt-3.5 max-h-[560px] overflow-y-auto pr-1">
                {inspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-charcoal-900 font-bold text-xs">{insp.id}</span>
                          <span className="text-xs font-semibold text-charcoal-800">{insp.buildingName}</span>
                          <span className="text-[11px] text-charcoal-500 font-mono">({insp.equipmentTag})</span>
                        </div>
                        <div className="text-[11px] text-charcoal-400 mt-0.5">
                          {insp.zone} • {new Date(insp.timestamp).toLocaleString()}
                        </div>
                      </div>

                      {/* Vision Analysis Status Badge */}
                      <div>
                        {insp.visionAnalysisStatus === 'unavailable' ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-charcoal-500 border border-gray-200 text-[10px] font-semibold flex items-center gap-1">
                            <EyeOff className="h-3 w-3 text-charcoal-400" />
                            Vision AI: Unavailable
                          </span>
                        ) : insp.visionAnalysisStatus === 'completed' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Vision AI: Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            Vision AI: Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image Thumbnail */}
                    {insp.imageUrl && (
                      <div className="rounded overflow-hidden border border-gray-200 bg-white max-h-44">
                        <img
                          src={insp.imageUrl}
                          alt={`Inspection ${insp.id}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Notes */}
                    <div className="text-xs text-charcoal-700 bg-white p-2.5 rounded border border-gray-200 leading-relaxed">
                      {insp.notes}
                    </div>

                    {/* Signature Strip */}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px] text-charcoal-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-charcoal-400" />
                        Audited by: <strong className="text-charcoal-800">{insp.inspectorName}</strong> ({insp.role})
                      </span>
                      <span className="capitalize text-forest-800 font-semibold">{insp.status.replace('_', ' ')}</span>
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
