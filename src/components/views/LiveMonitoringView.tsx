'use client';

import React, { useState, useEffect } from 'react';
import { Building, BuildingId } from '@/types';
import { Badge } from '@/components/ui/Badge';
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Droplet,
  Wind,
  Sun,
  Radio,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';

interface LiveMonitoringViewProps {
  buildings: Building[];
  onSelectBuilding: (id: BuildingId) => void;
}

export function LiveMonitoringView({ buildings, onSelectBuilding }: LiveMonitoringViewProps) {
  const [isPolling, setIsPolling] = useState(true);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(3);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [lastTickTime, setLastTickTime] = useState<Date>(new Date());
  const [jitterCount, setJitterCount] = useState<number>(0);

  // Periodic heartbeat tick simulation to show dynamic telemetry updates
  useEffect(() => {
    if (!isPolling) return;

    const timer = setInterval(() => {
      setLastTickTime(new Date());
      setJitterCount((prev) => prev + 1);
    }, pollIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isPolling, pollIntervalSec]);

  // Flatten all sensors from all buildings
  const allSensors = buildings.flatMap((b) =>
    b.sensors.map((s) => ({
      ...s,
      buildingId: b.id,
      buildingName: b.name,
    }))
  );

  const filteredSensors = allSensors.filter((s) => {
    if (selectedBuildingFilter !== 'all' && s.buildingId !== selectedBuildingFilter) return false;
    if (selectedTypeFilter !== 'all' && s.type !== selectedTypeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Stream Control Console */}

      <div className="card-clean p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${isPolling ? 'text-forest-700 animate-pulse' : 'text-charcoal-400'}`} />
            <h2 className="text-sm font-bold text-charcoal-900">
              Real-Time SCADA Resource Telemetry Stream
            </h2>
            <Badge variant="simulated">Sample IoT Stream</Badge>
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Streaming telemetry from campus submeters and automation gateways. Synthetic hardware readings are labeled.
          </p>
        </div>

        {/* Polling Heartbeat Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded border border-gray-200 text-xs">
            <span className="text-charcoal-500 pl-1 font-medium">Heartbeat:</span>
            <div className="flex gap-1">
              {[3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setPollIntervalSec(sec)}
                  className={`px-2 py-0.5 rounded font-mono text-xs transition-all ${
                    pollIntervalSec === sec
                      ? 'bg-white text-forest-800 font-bold border border-gray-300 shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-3 py-1.5 rounded font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
              isPolling
                ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                : 'bg-forest-800 text-white hover:bg-forest-900'
            }`}
          >
            {isPolling ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause Polling
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Resume Stream
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subsystem Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Power Quality Card */}
        <div className="card-clean p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-700 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-forest-700" />
                Power Quality & Factor
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-charcoal-900">
                0.94 <span className="text-xs font-normal text-charcoal-500">PF</span>
              </span>
              <span className="text-xs font-semibold text-emerald-700">Optimal</span>
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              Frequency: 50.02 Hz • THD: 2.1%
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-charcoal-400 flex justify-between font-mono">
            <span>Engineering Substation</span>
            <span>{lastTickTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Solar Farm Status */}
        <div className="card-clean p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-700 flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-amber-600" />
                Solar PV Generation
              </span>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-forest-800">
                640.2 <span className="text-xs font-normal text-charcoal-500">kWh</span>
              </span>
              <span className="text-xs font-semibold text-amber-700">1 Degraded</span>
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              Irradiance: 820 W/m² • Array Eff: 17.8%
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-charcoal-400 flex justify-between font-mono">
            <span>Rooftop Arrays 1-4</span>
            <span>{lastTickTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Chilled Water Loop */}
        <div className="card-clean p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-700 flex items-center gap-1.5">
                <Droplet className="h-4 w-4 text-sky-700" />
                Hydronic Chilled Loop
              </span>
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-charcoal-900">
                4.6 <span className="text-xs font-normal text-charcoal-500">bar</span>
              </span>
              <span className="text-xs font-semibold text-rose-700">Pressure Anomaly</span>
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              Supply Temp: 6.8°C • Delta-T: 4.2°C
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-charcoal-400 flex justify-between font-mono">
            <span>Central Chiller Plant</span>
            <span>{lastTickTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Campus Air Quality */}
        <div className="card-clean p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-700 flex items-center gap-1.5">
                <Wind className="h-4 w-4 text-slate-700" />
                Indoor Air Quality (IAQ)
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-charcoal-900">
                480 <span className="text-xs font-normal text-charcoal-500">ppm CO2</span>
              </span>
              <span className="text-xs font-semibold text-emerald-700">Fresh</span>
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              PM2.5: 8 µg/m³ • Humidity: 46% RH
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-charcoal-400 flex justify-between font-mono">
            <span>Quad IAQ Stations</span>
            <span>{lastTickTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Filter and Telemetry Feed Table */}
      <div className="card-clean p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 border-b border-gray-100 gap-4">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-forest-700" />
              Live Sensor Readings Table ({filteredSensors.length})
            </h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Individual SCADA and submeter telemetry channels across campus buildings.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="h-3.5 w-3.5 text-charcoal-400" />
              <select
                value={selectedBuildingFilter}
                onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
              >
                <option value="all">All Facilities</option>
                <option value="engineering">Engineering Block</option>
                <option value="library">Central Library</option>
                <option value="laboratory">Science Laboratory</option>
                <option value="cafeteria">Dining Commons</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2.5 py-1.5 text-charcoal-800 text-xs focus:outline-none focus:border-forest-600"
              >
                <option value="all">All Sensor Classes</option>
                <option value="smart_meter">Smart Meter</option>
                <option value="flow_sensor">Flow Sensor</option>
                <option value="acoustic_leak">Acoustic Leak</option>
                <option value="solar_inverter">Solar Inverter</option>
                <option value="thermal_sensor">Thermal Sensor</option>
                <option value="air_quality">Air Quality</option>
              </select>
            </div>
          </div>
        </div>

        {/* Telemetry Table */}
        <div className="overflow-x-auto mt-3.5">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-charcoal-500 font-medium bg-gray-50/60">
                <th className="py-2.5 px-3">Node ID</th>
                <th className="py-2.5 px-3">Facility</th>
                <th className="py-2.5 px-3">Sensor Name</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Live Reading</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Data Origin</th>
                <th className="py-2.5 px-3 text-right">Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSensors.map((sensor) => (
                <tr
                  key={sensor.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSelectBuilding(sensor.buildingId as BuildingId)}
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-charcoal-900">{sensor.id}</td>
                  <td className="py-2.5 px-3 font-medium text-charcoal-800">{sensor.buildingName}</td>
                  <td className="py-2.5 px-3 text-charcoal-600">{sensor.name}</td>
                  <td className="py-2.5 px-3 capitalize text-charcoal-500">{sensor.type.replace('_', ' ')}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-charcoal-900">
                    {sensor.value} <span className="font-normal text-charcoal-400">{sensor.unit}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={sensor.status}>{sensor.status}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="simulated">Sample Telemetry</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-charcoal-400">
                    {sensor.lastReadingTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


