import {
  CampusOverview,
  Building,
  Alert,
  Inspection,
  FollowUp,
  AgentMessage,
  AgentRecommendation,
  SustainabilityReport,
  SustainabilityRecommendation,
  ApiResponse,
  CameraServiceStatus,
  LogicalCameraId,
  CameraEvent,
  WebcamDevice,
} from '@/types';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        // Check if the server already returned standard { data, error } format
        if (json && ('data' in json || 'error' in json)) {
          return json as ApiResponse<T>;
        }
        return { data: json as T, error: null };
      }

      if (!response.ok) {
        return {
          data: null,
          error: {
            code: `HTTP_${response.status}`,
            message: `Server returned status ${response.status}: ${response.statusText}`,
          },
        };
      }

      return { data: null, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network request failed';
      return {
        data: null,
        error: {
          code: 'CLIENT_NETWORK_ERROR',
          message: `Unable to connect to backend endpoint ${endpoint}: ${message}`,
          details: err,
        },
      };
    }
  }

  // Campus Overview
  async getCampusOverview(): Promise<ApiResponse<CampusOverview>> {
    return this.request<CampusOverview>('/api/campus/overview');
  }

  // Buildings
  async getBuildings(): Promise<ApiResponse<Building[]>> {
    return this.request<Building[]>('/api/buildings');
  }

  async getBuilding(id: string): Promise<ApiResponse<Building>> {
    return this.request<Building>(`/api/buildings/${id}`);
  }

  // Alerts
  async getAlerts(filters?: { severity?: string; buildingId?: string; status?: string }): Promise<ApiResponse<Alert[]>> {
    const params = new URLSearchParams();
    if (filters?.severity && filters.severity !== 'all') params.set('severity', filters.severity);
    if (filters?.buildingId && filters.buildingId !== 'all') params.set('buildingId', filters.buildingId);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<Alert[]>(`/api/alerts${queryString}`);
  }

  // EcoPilot AI Agent
  async chatWithAgent(
    message: string,
    context?: { buildingId?: string; alertId?: string }
  ): Promise<ApiResponse<AgentMessage>> {
    return this.request<AgentMessage>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async getAgentRecommendation(params: {
    alertId?: string;
    buildingId?: string;
    focusArea?: string;
  }): Promise<ApiResponse<AgentRecommendation>> {
    return this.request<AgentRecommendation>('/api/agent/recommend', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Inspections
  async createInspection(data: {
    buildingId: string;
    buildingName: string;
    zone: string;
    equipmentTag: string;
    inspectorName: string;
    role: string;
    notes: string;
    imageUrl?: string;
  }): Promise<ApiResponse<Inspection>> {
    return this.request<Inspection>('/api/inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInspections(): Promise<ApiResponse<Inspection[]>> {
    return this.request<Inspection[]>('/api/inspections');
  }

  // Follow-ups
  async createFollowUp(data: {
    alertId?: string;
    recommendationId?: string;
    buildingId: string;
    buildingName: string;
    verifierName: string;
    role: string;
    preReading: string;
    postReading: string;
    status: 'verified_improved' | 'inconclusive' | 'requires_rework';
    notes: string;
  }): Promise<ApiResponse<FollowUp>> {
    return this.request<FollowUp>('/api/follow-ups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFollowUps(): Promise<ApiResponse<FollowUp[]>> {
    return this.request<FollowUp[]>('/api/follow-ups');
  }

  // Recommendations
  async getRecommendations(): Promise<ApiResponse<SustainabilityRecommendation[]>> {
    return this.request<SustainabilityRecommendation[]>('/api/recommendations');
  }

  async updateRecommendationStatus(
    id: string,
    status: SustainabilityRecommendation['status']
  ): Promise<ApiResponse<SustainabilityRecommendation>> {
    return this.request<SustainabilityRecommendation>('/api/recommendations', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    });
  }

  // Reports
  async generateReport(params: {
    dateRange: { start: string; end: string; label: string };
    buildingFilter: string;
  }): Promise<ApiResponse<SustainabilityReport>> {
    return this.request<SustainabilityReport>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Phase 1: Virtual Campus Cameras & Environmental Surveillance
  async getCameraStatus(): Promise<ApiResponse<CameraServiceStatus>> {
    return this.request<CameraServiceStatus>('/api/cameras/status');
  }

  async selectCamera(cameraId: LogicalCameraId): Promise<ApiResponse<{ selected_camera_id: string; building_id: string }>> {
    return this.request<{ selected_camera_id: string; building_id: string }>('/api/cameras/select', {
      method: 'POST',
      body: JSON.stringify({ camera_id: cameraId }),
    });
  }

  async setMonitoring(
    action: 'start' | 'stop',
    cameraId?: LogicalCameraId
  ): Promise<ApiResponse<{ is_monitoring: boolean; status: string }>> {
    return this.request<{ is_monitoring: boolean; status: string }>('/api/cameras/monitoring', {
      method: 'POST',
      body: JSON.stringify({ action, camera_id: cameraId }),
    });
  }

  async testCameraDevice(deviceIndex: number): Promise<ApiResponse<{ success: boolean; status: string; resolution?: string; error?: string }>> {
    return this.request<{ success: boolean; status: string; resolution?: string; error?: string }>('/api/cameras/test', {
      method: 'POST',
      body: JSON.stringify({ device_index: deviceIndex }),
    });
  }

  async getCameraDevices(): Promise<ApiResponse<{ devices: WebcamDevice[]; active_index: number }>> {
    return this.request<{ devices: WebcamDevice[]; active_index: number }>('/api/cameras/devices');
  }

  async getCameraEvents(filters?: {
    cameraId?: string;
    buildingId?: string;
    wasteCategory?: string;
    reviewStatus?: string;
    limit?: number;
  }): Promise<ApiResponse<CameraEvent[]>> {
    const params = new URLSearchParams();
    if (filters?.cameraId && filters.cameraId !== 'all') params.set('camera_id', filters.cameraId);
    if (filters?.buildingId && filters.buildingId !== 'all') params.set('building_id', filters.buildingId);
    if (filters?.wasteCategory && filters.wasteCategory !== 'all') params.set('category', filters.wasteCategory);
    if (filters?.reviewStatus && filters.reviewStatus !== 'all') params.set('review_status', filters.reviewStatus);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<CameraEvent[]>(`/api/cameras/events${queryString}`);
  }

  async getCameraEvent(eventId: string): Promise<ApiResponse<CameraEvent>> {
    return this.request<CameraEvent>(`/api/cameras/events?event_id=${eventId}`);
  }

  async updateEventReviewStatus(
    eventId: string,
    reviewStatus: 'pending_review' | 'verified_waste' | 'false_positive' | 'resolved',
    notes?: string
  ): Promise<ApiResponse<CameraEvent>> {
    return this.request<CameraEvent>('/api/cameras/events', {
      method: 'PATCH',
      body: JSON.stringify({
        event_id: eventId,
        review_status: reviewStatus,
        notes: notes,
      }),
    });
  }

  async getCameraAnalytics(params?: {
    timeframe?: string;
    buildingId?: string;
    cameraId?: string;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.timeframe) searchParams.set('timeframe', params.timeframe);
    if (params?.buildingId && params.buildingId !== 'all') searchParams.set('building_id', params.buildingId);
    if (params?.cameraId && params.cameraId !== 'all') searchParams.set('camera_id', params.cameraId);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<any>(`/api/analytics/camera-events${qs}`);
  }

  async recordCameraDetection(payload: {
    camera_id: string;
    detected_class: string;
    confidence: number;
    similarity_score?: number;
    waste_category?: string;
    item_name?: string;
    evidence_image_url?: string;
    zone?: string;
  }): Promise<ApiResponse<CameraEvent>> {
    return this.request<CameraEvent>('/api/cameras/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient();

