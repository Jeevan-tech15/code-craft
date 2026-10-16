export type BuildingId = 'engineering' | 'library' | 'laboratory' | 'cafeteria';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'investigating' | 'resolved' | 'follow_up_scheduled';
export type AlertCategory = 'electricity' | 'water' | 'waste' | 'carbon' | 'equipment';

export interface ResourceMetric {
  current: number;
  peak: number;
  unit: string;
  changePercent: number; // vs yesterday / baseline
  status: 'normal' | 'elevated' | 'critical';
}

export interface CampusOverview {
  overallEfficiencyScore: number;
  isSimulated: boolean;
  dataSourceLabel: string;
  lastUpdated: string;
  electricity: {
    currentKwh: number;
    peakKwh: number;
    gridKwh: number;
    solarKwh: number;
    changePercent: number;
    unit: string;
  };
  water: {
    currentLiters: number;
    recycledLiters: number;
    greywaterLiters: number;
    recyclingRate: number; // percentage e.g. 42
    changePercent: number;
    unit: string;
  };
  waste: {
    currentKg: number;
    diversionRate: number; // percentage e.g. 68
    organicKg: number;
    recyclableKg: number;
    landfillKg: number;
    changePercent: number;
    unit: string;
  };
  carbon: {
    currentCo2e: number; // tons
    dailyNetCo2e: number;
    reductionVsBaselinePercent: number;
    changePercent: number;
    unit: string;
  };
  alertsSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  buildingRankings: Array<{
    id: BuildingId;
    name: string;
    efficiencyScore: number;
    activeAlerts: number;
    status: 'normal' | 'warning' | 'critical';
    primaryAnomaly?: string;
  }>;
}

export interface BuildingAnomaly {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
  equipmentId: string;
  evidenceValue: string;
  baselineValue: string;
  possibleCause: string;
}

export interface SensorTelemetry {
  id: string;
  name: string;
  type: 'smart_meter' | 'flow_sensor' | 'air_quality' | 'solar_inverter' | 'thermal_sensor' | 'acoustic_leak';
  value: string;
  unit: string;
  status: 'online' | 'degraded' | 'offline';
  isSimulated: boolean;
  lastReadingTime: string;
}

export interface Building {
  id: BuildingId;
  name: string;
  code: string;
  tagline: string;
  description: string;
  status: 'normal' | 'warning' | 'critical';
  efficiencyScore: number;
  activeAlertsCount: number;
  areaSqFt: number;
  occupancy: {
    current: number;
    capacity: number;
  };
  resources: {
    electricityKwh: number;
    waterLiters: number;
    wasteKg: number;
    carbonTons: number;
    solarGenerationKwh: number;
  };
  historicalTrend: Array<{
    timestamp: string;
    electricity: number;
    water: number;
    waste: number;
    carbon: number;
  }>;
  anomalies: BuildingAnomaly[];
  sensors: SensorTelemetry[];
  location: {
    zone: string;
    floorCount: number;
  };
}

export interface SupportingReading {
  metric: string;
  value: string;
  normalRange: string;
  deviation: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  buildingId: BuildingId;
  buildingName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  timestamp: string;
  equipmentId: string;
  sensorId: string;
  supportingReadings: SupportingReading[];
  possibleCauses: string[];
  nextActions: string[];
  recommendationId?: string;
  followUpId?: string;
}

export interface ActionableStep {
  stepNumber: number;
  instruction: string;
  expectedOutcome: string;
}

export interface AgentRecommendation {
  id: string;
  title: string;
  impact: string;
  effort: 'Low' | 'Medium' | 'High';
  priority: AlertSeverity;
  steps: ActionableStep[];
  estimatedSavings: string;
}

export interface AgentMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isRuleBasedFallback?: boolean;
  confidence?: number; // e.g. 94%
  priority?: AlertSeverity;
  citations?: string[];
  evidence?: Array<{
    label: string;
    value: string;
    context: string;
  }>;
  actionableRecommendations?: AgentRecommendation[];
}

export interface VisionAnalysisResult {
  detectedIssue: string;
  confidence: number;
  visualEvidence: string;
  severityRecommendation: AlertSeverity;
  recommendedActions: string[];
}

export interface Inspection {
  id: string;
  buildingId: BuildingId;
  buildingName: string;
  zone: string;
  equipmentTag: string;
  inspectorName: string;
  role: string;
  timestamp: string;
  notes: string;
  imageUrl?: string;
  visionAnalysisStatus: 'completed' | 'unavailable' | 'pending';
  visionResult?: VisionAnalysisResult;
  status: 'submitted' | 'under_review' | 'verified';
}

export type FollowUpStatus = 'verified_improved' | 'inconclusive' | 'requires_rework';

export interface FollowUp {
  id: string;
  alertId?: string;
  recommendationId?: string;
  buildingId: BuildingId;
  buildingName: string;
  verifierName: string;
  role: string;
  timestamp: string;
  preReading: string;
  postReading: string;
  status: FollowUpStatus;
  notes: string;
  attachmentUrl?: string;
}

export interface SustainabilityRecommendation {
  id: string;
  title: string;
  description: string;
  buildingId: BuildingId;
  buildingName: string;
  category: 'energy' | 'water' | 'waste' | 'carbon' | 'hvac';
  priority: AlertSeverity;
  status: 'todo' | 'in_progress' | 'verified' | 'completed';
  projectedSavings: {
    kwh?: number;
    waterLiters?: number;
    co2eTons?: number;
    costSavingsMonthly?: string;
  };
  difficulty: 'Easy' | 'Medium' | 'High';
  paybackPeriod: string;
  assignee: string;
  deadline: string;
  verificationCriteria: string;
  isAiGenerated: boolean;
  steps: string[];
}

export interface SustainabilityReport {
  id: string;
  title: string;
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
  buildingFilter: string;
  summary: {
    totalKwhSaved: number;
    totalWaterSavedLiters: number;
    totalCo2AvoidedTons: number;
    estimatedCostSaved: string;
    alertsResolvedCount: number;
    followUpsLogged: number;
  };
  buildingBreakdown: Array<{
    buildingId: BuildingId;
    buildingName: string;
    efficiencyScore: number;
    electricityKwh: number;
    waterLiters: number;
    activeAlerts: number;
  }>;
  keyRecommendations: string[];
  followUpAuditTrail: Array<{
    id: string;
    verifier: string;
    building: string;
    outcome: string;
    date: string;
  }>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

// ==============================================================================
// PHASE 1: VIRTUAL CAMPUS CAMERAS & ENVIRONMENTAL SURVEILLANCE
// ==============================================================================

export type LogicalCameraId = 'camera-1' | 'camera-2' | 'camera-3' | 'camera-4';

export type CameraConnectionStatus =
  | 'CONNECTED'
  | 'OFFLINE'
  | 'NOT CONFIGURED'
  | 'MODEL UNAVAILABLE'
  | 'INACTIVE IN DEMO MODE'
  | 'READY';

export interface LogicalCameraProfile {
  id: LogicalCameraId;
  name: string;
  building_id: BuildingId;
  building_name: string;
  zone: string;
  is_selected: boolean;
  status: CameraConnectionStatus;
  is_demo_mode: boolean;
  physical_device: string;
  last_frame_time: number | null;
  last_detection_time: number | null;
}

export interface CameraEvent {
  id: string;
  event_code: string;
  camera_id: string;
  building_id: BuildingId;
  building_name: string;
  detected_class: string;
  confidence: number;
  detected_at: string;
  timestamp?: string;
  evidence_storage_path?: string | null;
  evidence_image_url?: string | null;
  model_name: string;
  model_version: string;
  persistence_status: 'stored' | 'evidence_pending' | 'evidence_failed';
  is_verified: boolean;
  item_name?: string;
  waste_category?: string;
  zone?: string;
  similarity_score?: number;
  bbox?: [number, number, number, number] | null;
  polygon?: [number, number][] | null;
  match_inliers?: number;
  review_status?: 'unreviewed' | 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved';
  notes?: string;
}

export interface CameraServiceStatus {
  active_camera_id: LogicalCameraId;
  is_monitoring: boolean;
  webcam_status: string;
  physical_device_index: number;
  session_id: string;
  model_status: {
    model_name: string;
    model_version: string;
    model_path: string;
    is_available: boolean;
    status: string;
    error_reason: string;
    supported_classes: string[];
    confidence_threshold: number;
    cooldown_seconds: number;
  };
  cameras: Record<LogicalCameraId, LogicalCameraProfile>;
}

export interface WebcamDevice {
  index: number;
  name: string;
  resolution: string;
  is_default: boolean;
  status: string;
}

