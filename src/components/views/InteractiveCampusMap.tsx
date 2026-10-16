'use client';

import React, { useState } from 'react';
import { Building, BuildingId } from '@/types';
import { Badge } from '@/components/ui/Badge';
import {
  Compass,
  Layers,
  ChevronRight,
  Zap,
  Droplet,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Maximize2,
  Info,
} from 'lucide-react';

interface InteractiveCampusMapProps {
  buildings: Building[];
  selectedBuildingId?: BuildingId;
  onSelectBuilding: (id: BuildingId) => void;
  onNavigateToBuildingDetails: (id: BuildingId) => void;
  onInvestigateAlert?: (alertId: string, buildingId: BuildingId) => void;
}

export function InteractiveCampusMap({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateToBuildingDetails,
}: InteractiveCampusMapProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingId | null>(null);
  const [mapLayer, setMapLayer] = useState<'all' | 'energy' | 'water' | 'alerts'>('all');

  const selected = buildings.find((b) => b.id === (selectedBuildingId || 'engineering')) || buildings[0];
  const hovered = buildings.find((b) => b.id === hoveredBuilding);
  const activeFocus = hovered || selected;

  // Architectural Site Plan coordinates on 1000x600 drafting canvas
  const buildingNodes: Record<
    BuildingId,
    {
      x: number;
      y: number;
      width: number;
      height: number;
      labelX: number;
      labelY: number;
      zone: string;
      code: string;
    }
  > = {
    engineering: {
      x: 100,
      y: 90,
      width: 340,
      height: 190,
      labelX: 270,
      labelY: 185,
      zone: 'North Academic Sector',
      code: 'ENG-BLK-A',
    },
    library: {
      x: 560,
      y: 80,
      width: 350,
      height: 180,
      labelX: 735,
      labelY: 170,
      zone: 'Central Quad & Commons',
      code: 'LIB-CTR-C',
    },
    laboratory: {
      x: 110,
      y: 350,
      width: 330,
      height: 200,
      labelX: 275,
      labelY: 450,
      zone: 'West Research Sector',
      code: 'SCI-LAB-01',
    },
    cafeteria: {
      x: 570,
      y: 340,
      width: 340,
      height: 190,
      labelX: 740,
      labelY: 435,
      zone: 'South Student Commons',
      code: 'DIN-COM-S',
    },
  };

  const getStatusMarker = (status: Building['status']) => {
    switch (status) {
      case 'critical':
        return {
          fill: '#BE123C',
          bg: '#FFE4E6',
          border: '#FDA4AF',
          text: 'Critical Anomaly',
        };
      case 'warning':
        return {
          fill: '#B45309',
          bg: '#FEF3C7',
          border: '#FCD34D',
          text: 'Telemetry Warning',
        };
      case 'normal':
      default:
        return {
          fill: '#164E3D',
          bg: '#E6F4EA',
          border: '#A7D7B9',
          text: 'Nominal State',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Map Control Toolbar */}
      <div className="card-clean p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-forest-800" />
            <h2 className="text-sm font-bold text-charcoal-900">
              Architectural Campus Site Plan & Telemetry Topology
            </h2>
            <Badge variant="simulated">Masterplan CAD Scale 1:500</Badge>
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Architectural schematic of campus facilities and submetering hubs. Click any building footprint to inspect live telemetry.
          </p>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-charcoal-500 flex items-center gap-1 font-medium">
            <Layers className="h-3.5 w-3.5 text-charcoal-400" />
            Active Layer:
          </span>
          <div className="flex bg-gray-100 rounded-md p-1 border border-gray-200">
            {(['all', 'energy', 'water', 'alerts'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setMapLayer(layer)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-all ${
                  mapLayer === layer
                    ? 'bg-white text-forest-800 font-semibold shadow-xs border border-gray-200'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Architectural Map Layout & Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Drafting Canvas */}
        <div className="lg:col-span-8 card-clean p-4 flex flex-col items-center justify-center relative overflow-hidden bg-[#FBFBFA]">
          {/* Subtle architectural drafting grid background */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* North Architectural Compass Arrow */}
          <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded p-2 flex flex-col items-center text-[10px] text-charcoal-600 shadow-xs pointer-events-none">
            <span className="text-forest-800 font-bold">N</span>
            <span className="text-charcoal-400 leading-none">▲</span>
            <span className="text-[9px] text-charcoal-400">SITE</span>
          </div>

          {/* SVG Site Plan Viewport */}
          <div className="w-full aspect-[16/10] max-h-[520px] relative">
            <svg
              viewBox="0 0 1000 600"
              className="w-full h-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Architectural diagonal hatch for utility zones */}
                <pattern
                  id="archHatch"
                  width="8"
                  height="8"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#E2E8F0" strokeWidth="1" />
                </pattern>

                {/* Solar array hatch */}
                <pattern
                  id="solarHatch"
                  width="12"
                  height="6"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="10" height="4" fill="#E6F4EA" stroke="#164E3D" strokeWidth="0.5" />
                </pattern>
              </defs>

              {/* Site Boundary & Outer Curbs */}
              <rect
                x="15"
                y="15"
                width="970"
                height="570"
                rx="6"
                fill="#F8F9FA"
                stroke="#D1D5DB"
                strokeWidth="1.5"
              />

              {/* Landscaped Green Corridors / Courtyards */}
              <rect x="460" y="30" width="80" height="540" fill="#F0F7F3" stroke="#D1E6D8" strokeWidth="1" />
              <rect x="30" y="295" width="940" height="40" fill="#F0F7F3" stroke="#D1E6D8" strokeWidth="1" />

              {/* Central Quad Plaza Circle */}
              <circle cx="500" cy="315" r="54" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
              <circle cx="500" cy="315" r="42" fill="#F4F5F6" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="3 3" />
              <text
                x="500"
                y="319"
                textAnchor="middle"
                fill="#475569"
                fontSize="9"
                fontWeight="700"
                letterSpacing="1.5"
              >
                CENTRAL QUADRANGLE
              </text>

              {/* Stormwater Retention & Bioswale */}
              <ellipse cx="500" cy="180" rx="34" ry="24" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1" />
              <text x="500" y="184" textAnchor="middle" fill="#1D4ED8" fontSize="8" fontWeight="600">
                BIOSWALE BASIN
              </text>

              {/* Pedestrian Pathways (dashed lines) */}
              <line x1="440" y1="30" x2="440" y2="570" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="560" y1="30" x2="560" y2="570" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />

              {/* Render 4 Building Footprints */}
              {buildings.map((building) => {
                const node = buildingNodes[building.id];
                if (!node) return null;

                const isSelected = selectedBuildingId === building.id;
                const isHovered = hoveredBuilding === building.id;
                const statusStyle = getStatusMarker(building.status);

                return (
                  <g
                    key={building.id}
                    className="cursor-pointer"
                    onClick={() => onSelectBuilding(building.id)}
                    onMouseEnter={() => setHoveredBuilding(building.id)}
                    onMouseLeave={() => setHoveredBuilding(null)}
                  >
                    {/* Selected Building Outer Halo */}
                    {isSelected && (
                      <rect
                        x={node.x - 6}
                        y={node.y - 6}
                        width={node.width + 12}
                        height={node.height + 12}
                        rx="8"
                        fill="none"
                        stroke="#164E3D"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    )}

                    {/* Building Blueprint Footprint */}
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx="4"
                      fill={isHovered ? '#FFFFFF' : '#FFFFFF'}
                      stroke={isSelected ? '#164E3D' : isHovered ? '#475569' : '#374151'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                    />

                    {/* Architectural Double-Line Offset */}
                    <rect
                      x={node.x + 4}
                      y={node.y + 4}
                      width={node.width - 8}
                      height={node.height - 8}
                      rx="2"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />

                    {/* Rooftop Solar PV Field pattern (at Engineering) */}
                    {building.id === 'engineering' && (
                      <g>
                        <rect
                          x={node.x + 16}
                          y={node.y + 16}
                          width={node.width - 32}
                          height={40}
                          fill="url(#solarHatch)"
                          stroke="#164E3D"
                          strokeWidth="0.8"
                        />
                        <text
                          x={node.x + node.width / 2}
                          y={node.y + 38}
                          textAnchor="middle"
                          fill="#0F3D2E"
                          fontSize="9"
                          fontWeight="700"
                          letterSpacing="0.5"
                        >
                          180 kW ROOFTOP BIFACIAL PV FARM
                        </text>
                      </g>
                    )}

                    {/* Facility Title & Code */}
                    <text
                      x={node.labelX}
                      y={building.id === 'engineering' ? node.labelY + 8 : node.labelY - 6}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="14"
                      fontWeight="700"
                      className="select-none tracking-tight"
                    >
                      {building.name.toUpperCase()}
                    </text>
                    <text
                      x={node.labelX}
                      y={building.id === 'engineering' ? node.labelY + 26 : node.labelY + 12}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      {node.code} • HEALTH INDEX: {building.efficiencyScore}%
                    </text>

                    {/* Status Pill in Building Header */}
                    <g transform={`translate(${node.x + 12}, ${node.y + (building.id === 'engineering' ? node.height - 36 : 14)})`}>
                      <rect
                        x="0"
                        y="0"
                        width="86"
                        height="20"
                        rx="3"
                        fill={statusStyle.bg}
                        stroke={statusStyle.border}
                        strokeWidth="1"
                      />
                      <circle cx="10" cy="10" r="3.5" fill={statusStyle.fill} />
                      <text x="20" y="14" fill={statusStyle.fill} fontSize="9" fontWeight="700">
                        {building.status.toUpperCase()}
                      </text>
                    </g>

                    {/* Active Alert Count Badge if > 0 */}
                    {building.activeAlertsCount > 0 && (
                      <g transform={`translate(${node.x + node.width - 32}, ${node.y + (building.id === 'engineering' ? node.height - 36 : 14)})`}>
                        <circle cx="10" cy="10" r="10" fill="#BE123C" />
                        <text x="10" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">
                          {building.activeAlertsCount}
                        </text>
                      </g>
                    )}

                    {/* Telemetry Chips (Energy & Water) */}
                    <g transform={`translate(${node.x + 12}, ${node.y + node.height - 30})`}>
                      {(mapLayer === 'energy' || mapLayer === 'all') && (
                        <g>
                          <rect x="0" y="0" width="115" height="20" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
                          <text x="8" y="14" fill="#334155" fontSize="10" fontWeight="600" fontFamily="monospace">
                            ⚡ {building.resources.electricityKwh} kWh
                          </text>
                        </g>
                      )}

                      {(mapLayer === 'water' || mapLayer === 'all') && (
                        <g transform="translate(125, 0)">
                          <rect x="0" y="0" width="115" height="20" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
                          <text x="8" y="14" fill="#0369A1" fontSize="10" fontWeight="600" fontFamily="monospace">
                            💧 {building.resources.waterLiters.toLocaleString()} L
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Architectural Drawing Legend */}
          <div className="w-full flex flex-wrap items-center justify-between text-xs text-charcoal-500 pt-3 border-t border-gray-200 gap-2 mt-2 bg-white px-2 rounded">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Nominal Condition
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Telemetry Warning
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                Critical Anomaly
              </span>
            </div>
            <div className="text-[11px] text-charcoal-400">
              * Click any building footprint to open technical telemetry
            </div>
          </div>
        </div>

        {/* Selected Facility Inspector Side Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card-clean p-5 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-forest-800 uppercase tracking-wider">
                  Facility Specification
                </span>
                <h3 className="text-base font-bold text-charcoal-900 mt-0.5">{activeFocus.name}</h3>
                <p className="text-xs text-charcoal-500">{activeFocus.code} • {activeFocus.location.zone}</p>
              </div>
              <Badge variant={activeFocus.status}>{activeFocus.status}</Badge>
            </div>

            <p className="text-xs text-charcoal-600 leading-relaxed">
              {activeFocus.description}
            </p>

            {/* Health & Occupancy Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">
                  Sustainability Score
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-forest-800">
                    {activeFocus.efficiencyScore}
                  </span>
                  <span className="text-xs text-charcoal-400">/ 100</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-forest-700 h-full rounded-full"
                    style={{ width: `${activeFocus.efficiencyScore}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-charcoal-500 uppercase font-semibold block">
                  Current Occupancy
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-charcoal-800">
                    {activeFocus.occupancy.current}
                  </span>
                  <span className="text-xs text-charcoal-400">/ {activeFocus.occupancy.capacity}</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-slate-600 h-full rounded-full"
                    style={{ width: `${(activeFocus.occupancy.current / activeFocus.occupancy.capacity) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Resource Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded bg-gray-50 border border-gray-200 text-xs">
                <span className="flex items-center gap-2 text-charcoal-700">
                  <Zap className="h-4 w-4 text-forest-700" />
                  Electricity Demand
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-charcoal-900">{activeFocus.resources.electricityKwh} kWh</span>
                  {activeFocus.resources.solarGenerationKwh > 0 && (
                    <span className="block text-[10px] text-forest-700 font-medium">
                      +{activeFocus.resources.solarGenerationKwh} kWh Solar PV
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-gray-50 border border-gray-200 text-xs">
                <span className="flex items-center gap-2 text-charcoal-700">
                  <Droplet className="h-4 w-4 text-sky-700" />
                  Water Consumption
                </span>
                <span className="font-mono font-bold text-charcoal-900">
                  {activeFocus.resources.waterLiters.toLocaleString()} L
                </span>
              </div>
            </div>

            {/* Active Anomaly Banner if present */}
            {activeFocus.anomalies.length > 0 && (
              <div className="p-3 rounded bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Active Telemetry Anomaly
                </div>
                <p className="text-xs font-semibold text-charcoal-800">{activeFocus.anomalies[0].title}</p>
                <p className="text-[11px] text-charcoal-600 font-mono">
                  {activeFocus.anomalies[0].evidenceValue}
                </p>
              </div>
            )}

            <button
              onClick={() => onNavigateToBuildingDetails(activeFocus.id)}
              className="w-full py-2 px-4 rounded bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              Open Full Building Analytics
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Facility Switcher Buttons */}
          <div className="card-clean p-3 space-y-2">
            <span className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider block">
              Quick Facility Jump
            </span>
            <div className="grid grid-cols-2 gap-2">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBuilding(b.id)}
                  className={`text-left p-2 rounded text-xs border transition-all ${
                    selectedBuildingId === b.id
                      ? 'bg-forest-50 border-forest-600 text-forest-900 font-semibold'
                      : 'bg-white border-gray-200 text-charcoal-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="truncate">{b.name}</div>
                  <div className="text-[10px] text-charcoal-400 flex justify-between mt-1 font-mono">
                    <span>{b.code}</span>
                    <span className="font-semibold text-charcoal-800">{b.efficiencyScore}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
