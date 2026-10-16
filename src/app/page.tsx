'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CampusOverview,
  Building,
  Alert,
  BuildingId,
  CameraEvent,
} from '@/types';
import { apiClient } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ActiveTab } from '@/components/layout/Navbar';
import { LoadingSpinner, LoadingSkeleton } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

// View Components
import { DashboardView } from '@/components/views/DashboardView';
import { InteractiveCampusMap } from '@/components/views/InteractiveCampusMap';
import { BuildingDetailsView } from '@/components/views/BuildingDetailsView';
import { LiveMonitoringView } from '@/components/views/LiveMonitoringView';
import { AlertsView } from '@/components/views/AlertsView';
import { EcoPilotPanel } from '@/components/views/EcoPilotPanel';
import { InspectionsView } from '@/components/views/InspectionsView';
import { RecommendationsView } from '@/components/views/RecommendationsView';
import { FollowUpsView } from '@/components/views/FollowUpsView';
import { ReportsView } from '@/components/views/ReportsView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [overview, setOverview] = useState<CampusOverview | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cross-view selection state
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId>('engineering');
  const [contextAlertId, setContextAlertId] = useState<string | undefined>(undefined);
  const [contextBuildingId, setContextBuildingId] = useState<BuildingId | undefined>(undefined);
  const [contextRecommendationId, setContextRecommendationId] = useState<string | undefined>(undefined);
  const [agentInitialPrompt, setAgentInitialPrompt] = useState<string | undefined>(undefined);

  // Fetch initial campus data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovRes, bdRes, alRes] = await Promise.all([
        apiClient.getCampusOverview(),
        apiClient.getBuildings(),
        apiClient.getAlerts(),
      ]);

      if (ovRes.error) {
        setError(ovRes.error.message);
        return;
      }
      if (ovRes.data) setOverview(ovRes.data);
      if (bdRes.data) setBuildings(bdRes.data);
      if (alRes.data) setAlerts(alRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to campus services');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching to building details from any view
  const handleSelectBuilding = (id: BuildingId) => {
    setSelectedBuildingId(id);
  };

  const handleNavigateToBuildingDetails = (id: BuildingId) => {
    setSelectedBuildingId(id);
    setActiveTab('buildings');
  };

  // Handle investigating an alert with EcoPilot
  const handleInvestigateAlert = (alertId: string, buildingId: BuildingId) => {
    const alertObj = alerts.find((a) => a.id === alertId);
    setContextAlertId(alertId);
    setContextBuildingId(buildingId);
    setSelectedBuildingId(buildingId);
    const prompt = alertObj
      ? `Investigate anomaly "${alertObj.title}" on equipment ${alertObj.equipmentId} at ${alertObj.buildingName}. What is causing the baseline deviation and what action protocol do you recommend?`
      : `Investigate anomaly ID ${alertId} at ${buildingId}.`;
    setAgentInitialPrompt(prompt);
    setActiveTab('agent');
  };

  // Handle asking EcoPilot about a building
  const handleAskEcoPilotAboutBuilding = (buildingId: BuildingId) => {
    const b = buildings.find((b) => b.id === buildingId);
    setContextBuildingId(buildingId);
    setContextAlertId(undefined);
    setAgentInitialPrompt(
      `Provide an energy & water conservation audit for ${b?.name || buildingId}. Point out detected anomalies, solar output, and top savings targets.`
    );
    setActiveTab('agent');
  };

  // Handle investigating a real camera detection with EcoPilot
  const handleInvestigateCameraEvent = (event: CameraEvent) => {
    const similarity =
      event.similarity_score !== undefined
        ? Math.round(event.similarity_score * 100)
        : Math.round((event.confidence || 0.85) * 100);
    const itemName = event.item_name || event.detected_class;
    const category = event.waste_category || 'general';
    const building = event.building_name || event.building_id;

    setContextBuildingId(event.building_id as BuildingId);
    setContextAlertId(undefined);
    setAgentInitialPrompt(
      `Inspect waste detection event ${event.event_code || event.id}: Detected item "${itemName}" in category "${category}" at ${building} (${event.zone || 'campus'}). Visual similarity score: ${similarity}%. What are the segregation guidelines, and is this an actionable waste problem?`
    );
    setActiveTab('agent');
  };

  // Handle scheduling or recording a follow-up
  const handleScheduleFollowUp = (
    alertId?: string,
    buildingId?: BuildingId,
    recId?: string
  ) => {
    setContextAlertId(alertId);
    setContextBuildingId(buildingId || selectedBuildingId);
    setContextRecommendationId(recId);
    setActiveTab('follow-ups');
  };

  // Refresh data after follow-up is submitted
  const handleFollowUpLogged = async () => {
    await loadData();
  };

  const activeAlertsCount = alerts.filter(
    (a) => a.status === 'active' || a.status === 'investigating'
  ).length;

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      activeAlertsCount={activeAlertsCount}
      overallScore={overview?.overallEfficiencyScore ?? 82.4}
      isSimulated={overview?.isSimulated ?? true}
    >
      {isLoading && !overview ? (
        <div className="py-24 space-y-4 max-w-xl mx-auto text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-2" />
          <h3 className="text-sm font-bold text-charcoal-800">
            Connecting to EcoTwin SCADA Core...
          </h3>
          <p className="text-xs text-charcoal-500">
            Loading real-time submeter feeds, solar telemetry & baseline models.
          </p>
          <LoadingSkeleton count={3} />
        </div>
      ) : error && !overview ? (
        <div className="py-12">
          <ErrorBanner
            message={`SCADA Telemetry Connection Notice: ${error}`}
            onRetry={loadData}
          />
        </div>
      ) : (
        <>
          {/* 1. Dashboard Overview */}
          {activeTab === 'dashboard' && overview && (
            <DashboardView
              overview={overview}
              buildings={buildings}
              alerts={alerts}
              onSelectBuilding={handleNavigateToBuildingDetails}
              onNavigateToTab={(tab) => {
                if (tab === 'map') setActiveTab('map');
                else if (tab === 'buildings') setActiveTab('buildings');
                else if (tab === 'alerts') setActiveTab('alerts');
                else if (tab === 'camera-events') setActiveTab('camera-events');
                else if (tab === 'ecopilot') setActiveTab('agent');
              }}
              onInvestigateAlert={handleInvestigateAlert}
              onInvestigateCameraEvent={handleInvestigateCameraEvent}
            />
          )}

          {/* 1b. Camera Events Gallery & Evidence Review */}
          {activeTab === 'camera-events' && (
            <AlertsView
              alerts={alerts}
              initialMode="camera"
              onInvestigateAlert={handleInvestigateAlert}
              onScheduleFollowUp={handleScheduleFollowUp}
              onNavigateToBuilding={handleNavigateToBuildingDetails}
              onInvestigateCameraEvent={handleInvestigateCameraEvent}
            />
          )}

          {/* 2. Architectural Campus Map */}
          {activeTab === 'map' && (
            <InteractiveCampusMap
              buildings={buildings}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={handleSelectBuilding}
              onNavigateToBuildingDetails={handleNavigateToBuildingDetails}
              onInvestigateAlert={handleInvestigateAlert}
            />
          )}

          {/* 3. Building Analytics */}
          {activeTab === 'buildings' && (
            <BuildingDetailsView
              buildings={buildings}
              selectedBuildingId={selectedBuildingId}
              alerts={alerts}
              onSelectBuilding={handleSelectBuilding}
              onInvestigateAlert={handleInvestigateAlert}
              onScheduleFollowUp={handleScheduleFollowUp}
              onAskEcoPilotAboutBuilding={handleAskEcoPilotAboutBuilding}
            />
          )}

          {/* 4. Live Telemetry Monitoring */}
          {activeTab === 'telemetry' && (
            <LiveMonitoringView
              buildings={buildings}
              onSelectBuilding={handleNavigateToBuildingDetails}
            />
          )}

          {/* 5. Camera Waste Events & Evidence */}
          {activeTab === 'camera-events' && (
            <AlertsView
              alerts={alerts}
              initialMode="camera"
              onInvestigateAlert={handleInvestigateAlert}
              onScheduleFollowUp={handleScheduleFollowUp}
              onNavigateToBuilding={handleNavigateToBuildingDetails}
              onInvestigateCameraEvent={handleInvestigateCameraEvent}
            />
          )}

          {/* 6. Alerts & Telemetry Anomalies */}
          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              initialMode="scada"
              onInvestigateAlert={handleInvestigateAlert}
              onScheduleFollowUp={handleScheduleFollowUp}
              onNavigateToBuilding={handleNavigateToBuildingDetails}
              onInvestigateCameraEvent={handleInvestigateCameraEvent}
            />
          )}

          {/* 6. EcoPilot AI Assistant */}
          {activeTab === 'agent' && (
            <EcoPilotPanel
              initialPrompt={agentInitialPrompt}
              contextAlertId={contextAlertId}
              contextBuildingId={contextBuildingId}
              alerts={alerts}
              onRecordFollowUp={handleScheduleFollowUp}
              onClearContext={() => {
                setContextAlertId(undefined);
                setContextBuildingId(undefined);
                setAgentInitialPrompt(undefined);
              }}
            />
          )}

          {/* 7. Facility Inspections */}
          {activeTab === 'inspections' && (
            <InspectionsView buildings={buildings} />
          )}

          {/* 8. Decarbonization Action Roadmap */}
          {activeTab === 'recommendations' && (
            <RecommendationsView
              onScheduleFollowUp={handleScheduleFollowUp}
              onAskEcoPilot={(prompt, bId) => {
                setAgentInitialPrompt(prompt);
                setContextBuildingId(bId);
                setActiveTab('agent');
              }}
            />
          )}

          {/* 9. Follow-Up Verification */}
          {activeTab === 'follow-ups' && (
            <FollowUpsView
              buildings={buildings}
              alerts={alerts}
              initialAlertId={contextAlertId}
              initialBuildingId={contextBuildingId}
              initialRecommendationId={contextRecommendationId}
              onFollowUpLogged={handleFollowUpLogged}
              onClearInitialContext={() => {
                setContextAlertId(undefined);
                setContextBuildingId(undefined);
                setContextRecommendationId(undefined);
              }}
            />
          )}

          {/* 10. Reports & Compliance Export */}
          {activeTab === 'reports' && (
            <ReportsView buildings={buildings} />
          )}
        </>
      )}
    </AppLayout>
  );
}
