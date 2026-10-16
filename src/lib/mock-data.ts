import {
  CampusOverview,
  Building,
  Alert,
  Inspection,
  FollowUp,
  SustainabilityRecommendation,
  SustainabilityReport,
  BuildingId,
} from '@/types';

// Initial Mock Seed Data
export const initialBuildings: Record<BuildingId, Building> = {
  engineering: {
    id: 'engineering',
    name: 'Engineering Block',
    code: 'ENG-BLK-A',
    tagline: 'Heavy Lab Equipment & Rooftop Solar PV Farm',
    description: 'Houses robotics, mechanical and computational engineering wings. Features a 180kW rooftop bifacial solar PV array and high-demand prototyping workshops.',
    status: 'warning',
    efficiencyScore: 78.5,
    activeAlertsCount: 2,
    areaSqFt: 84000,
    occupancy: {
      current: 1420,
      capacity: 1800,
    },
    resources: {
      electricityKwh: 1240.6,
      waterLiters: 18500,
      wasteKg: 340,
      carbonTons: 1.14,
      solarGenerationKwh: 640.2,
    },
    historicalTrend: [
      { timestamp: '00:00', electricity: 42, water: 320, waste: 10, carbon: 0.04 },
      { timestamp: '04:00', electricity: 68, water: 410, waste: 12, carbon: 0.06 }, // Unintended overnight spike
      { timestamp: '08:00', electricity: 110, water: 1200, waste: 45, carbon: 0.10 },
      { timestamp: '12:00', electricity: 185, water: 2400, waste: 90, carbon: 0.17 },
      { timestamp: '16:00', electricity: 165, water: 2100, waste: 75, carbon: 0.15 },
      { timestamp: '20:00', electricity: 95, water: 1100, waste: 30, carbon: 0.09 },
      { timestamp: '23:00', electricity: 58, water: 450, waste: 15, carbon: 0.05 },
    ],
    anomalies: [
      {
        id: 'anom-eng-1',
        title: 'Overnight HVAC Compressor Short-Cycling',
        description: 'Zone B Rooftop Air Handler 2 ran at 85% duty cycle between 02:30 AM and 05:45 AM while occupancy was 0.',
        severity: 'high',
        timestamp: 'Today, 04:15 AM',
        equipmentId: 'AHU-ENG-02B',
        evidenceValue: '68.4 kWh/hr (Expected < 14 kWh/hr)',
        baselineValue: '12.8 kWh/hr baseline',
        possibleCause: 'Stuck thermostat sensor or BMS override scheduled by night maintenance.',
      },
      {
        id: 'anom-eng-2',
        title: 'Solar Inverter 3 String Current Degradation',
        description: 'Inverter 3 output is 22% lower than adjacent arrays under equivalent 820 W/m² solar irradiance.',
        severity: 'medium',
        timestamp: 'Today, 11:30 AM',
        equipmentId: 'INV-PV-03',
        evidenceValue: '31.2 kW output (Expected 40.0 kW)',
        baselineValue: '39.8 kW benchmark',
        possibleCause: 'Accumulated dust/debris or micro-inverter diode fault on String 4.',
      },
    ],
    sensors: [
      { id: 'SN-ENG-PWR-01', name: 'Main Feeder 3-Phase Smart Meter', type: 'smart_meter', value: '412.5 A / 415 V', unit: 'A', status: 'online', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-ENG-PV-03', name: 'Rooftop Solar String Inverter', type: 'solar_inverter', value: '31.2', unit: 'kW', status: 'degraded', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-ENG-AQ-04', name: 'Mechatronics Lab Indoor Air Quality', type: 'air_quality', value: '38', unit: 'AQI', status: 'online', isSimulated: true, lastReadingTime: '2m ago' },
      { id: 'SN-ENG-WTR-02', name: 'Zone B Chilled Water Loop Flow', type: 'flow_sensor', value: '142', unit: 'L/min', status: 'online', isSimulated: true, lastReadingTime: 'Just now' },
    ],
    location: {
      zone: 'North Academic Sector',
      floorCount: 5,
    },
  },
  library: {
    id: 'library',
    name: 'Central Library',
    code: 'LIB-CENTRAL',
    tagline: 'Smart Daylight Harvesting & High Efficiency Chillers',
    description: 'Four-tier learning center with smart daylight harvesting, low-flow sensor faucets, and passive ventilation atrium.',
    status: 'normal',
    efficiencyScore: 94.2,
    activeAlertsCount: 0,
    areaSqFt: 62000,
    occupancy: {
      current: 890,
      capacity: 1200,
    },
    resources: {
      electricityKwh: 520.4,
      waterLiters: 6800,
      wasteKg: 110,
      carbonTons: 0.48,
      solarGenerationKwh: 120.0,
    },
    historicalTrend: [
      { timestamp: '00:00', electricity: 18, water: 80, waste: 4, carbon: 0.02 },
      { timestamp: '04:00', electricity: 19, water: 85, waste: 5, carbon: 0.02 },
      { timestamp: '08:00', electricity: 65, water: 750, waste: 20, carbon: 0.06 },
      { timestamp: '12:00', electricity: 92, water: 1400, waste: 35, carbon: 0.08 },
      { timestamp: '16:00', electricity: 88, water: 1350, waste: 32, carbon: 0.08 },
      { timestamp: '20:00', electricity: 55, water: 900, waste: 18, carbon: 0.05 },
      { timestamp: '23:00', electricity: 24, water: 210, waste: 8, carbon: 0.02 },
    ],
    anomalies: [],
    sensors: [
      { id: 'SN-LIB-PWR-01', name: 'Atrium Daylight Dimming Controller', type: 'smart_meter', value: '45.2', unit: 'kW', status: 'online', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-LIB-AQ-01', name: 'Quiet Study Hall Co2 & PM2.5', type: 'air_quality', value: '28', unit: 'AQI', status: 'online', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-LIB-WTR-01', name: 'Rainwater Cistern Level Gauge', type: 'flow_sensor', value: '84', unit: '% capacity', status: 'online', isSimulated: true, lastReadingTime: '5m ago' },
    ],
    location: {
      zone: 'Central Campus Plaza',
      floorCount: 4,
    },
  },
  laboratory: {
    id: 'laboratory',
    name: 'Advanced Science Laboratory',
    code: 'LAB-COMPLEX',
    tagline: 'Chemical Fume Hoods & Chilled Water Loops',
    description: 'Precision research facility with 24/7 chemical fume extraction, negative air pressure chambers, and hazardous waste segregation.',
    status: 'critical',
    efficiencyScore: 61.8,
    activeAlertsCount: 3,
    areaSqFt: 54000,
    occupancy: {
      current: 310,
      capacity: 450,
    },
    resources: {
      electricityKwh: 1680.9,
      waterLiters: 31400,
      wasteKg: 490,
      carbonTons: 1.55,
      solarGenerationKwh: 0,
    },
    historicalTrend: [
      { timestamp: '00:00', electricity: 95, water: 1450, waste: 25, carbon: 0.09 },
      { timestamp: '04:00', electricity: 98, water: 1620, waste: 28, carbon: 0.09 },
      { timestamp: '08:00', electricity: 160, water: 3400, waste: 65, carbon: 0.15 },
      { timestamp: '12:00', electricity: 235, water: 5800, waste: 110, carbon: 0.22 },
      { timestamp: '16:00', electricity: 220, water: 5200, waste: 95, carbon: 0.20 },
      { timestamp: '20:00', electricity: 140, water: 3100, waste: 45, carbon: 0.13 },
      { timestamp: '23:00', electricity: 105, water: 2100, waste: 30, carbon: 0.10 },
    ],
    anomalies: [
      {
        id: 'anom-lab-1',
        title: 'Chilled Water Loop Pressure Anomaly & Valve Leak',
        description: 'Differential pressure dropped from 3.8 bar to 1.9 bar in Basement Cooling Loop B while valve feedback reports 100% closed.',
        severity: 'critical',
        timestamp: 'Today, 08:45 AM',
        equipmentId: 'VLV-CWL-B04',
        evidenceValue: '48.5 L/min continuous leakage detected',
        baselineValue: '0.0 L/min baseline when isolated',
        possibleCause: 'Seat seal erosion on 4-inch 2-way modulating valve or pneumatic actuator stem binding.',
      },
      {
        id: 'anom-lab-2',
        title: 'Fume Hood Face Velocity Drop below OSHA Threshold',
        description: 'Exhaust Fume Hood #7 face velocity measured at 58 FPM (Safe regulatory minimum: 80 - 100 FPM).',
        severity: 'high',
        timestamp: 'Today, 10:15 AM',
        equipmentId: 'FHD-CHEM-07',
        evidenceValue: '58 FPM velocity',
        baselineValue: '100 FPM setpoint',
        possibleCause: 'VAV exhaust damper actuator miscalibration or clogged HEPA pre-filter cartridge.',
      },
      {
        id: 'anom-lab-3',
        title: 'Autoclave Electrical Surge during Peak Grid Tariff',
        description: 'Simultaneous unscheduled sterilization cycle during 11:30 AM peak tariff window triggered demand limiter alert.',
        severity: 'medium',
        timestamp: 'Today, 11:35 AM',
        equipmentId: 'ATC-BIO-02',
        evidenceValue: '48.0 kW peak pull',
        baselineValue: 'Off-peak scheduled',
        possibleCause: 'Manual bypass of automated load shedding protocol by lab technicians.',
      },
    ],
    sensors: [
      { id: 'SN-LAB-CW-01', name: 'Chilled Water Differential Pressure Transducer', type: 'flow_sensor', value: '1.9', unit: 'bar', status: 'degraded', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-LAB-FH-07', name: 'Fume Hood 7 Thermal Anemometer', type: 'air_quality', value: '58', unit: 'FPM', status: 'degraded', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-LAB-PWR-01', name: 'Sub-Panel Heavy Autoclave Feeder', type: 'smart_meter', value: '72.4', unit: 'kW', status: 'online', isSimulated: true, lastReadingTime: '1m ago' },
      { id: 'SN-LAB-LEAK-03', name: 'Basement Acoustic Leak Detector', type: 'acoustic_leak', value: '74', unit: 'dB (Acoustic Noise Spike)', status: 'degraded', isSimulated: true, lastReadingTime: 'Just now' },
    ],
    location: {
      zone: 'East Research Perimeter',
      floorCount: 3,
    },
  },
  cafeteria: {
    id: 'cafeteria',
    name: 'Campus Dining Commons',
    code: 'CAF-DINING',
    tagline: 'Kitchen Greywater & Food Composting Hub',
    description: 'Serves 4,500 daily meals. Houses high-capacity dishwashers, walk-in cold storage, and mechanical bio-waste digester.',
    status: 'warning',
    efficiencyScore: 74.0,
    activeAlertsCount: 1,
    areaSqFt: 38000,
    occupancy: {
      current: 680,
      capacity: 900,
    },
    resources: {
      electricityKwh: 980.2,
      waterLiters: 26400,
      wasteKg: 620,
      carbonTons: 0.89,
      solarGenerationKwh: 45.0,
    },
    historicalTrend: [
      { timestamp: '00:00', electricity: 32, water: 120, waste: 10, carbon: 0.03 },
      { timestamp: '04:00', electricity: 35, water: 180, waste: 15, carbon: 0.03 },
      { timestamp: '08:00', electricity: 95, water: 3800, waste: 80, carbon: 0.09 },
      { timestamp: '12:00', electricity: 175, water: 8200, waste: 240, carbon: 0.16 },
      { timestamp: '16:00', electricity: 110, water: 3900, waste: 90, carbon: 0.10 },
      { timestamp: '20:00', electricity: 145, water: 6200, waste: 160, carbon: 0.13 },
      { timestamp: '23:00', electricity: 48, water: 800, waste: 25, carbon: 0.04 },
    ],
    anomalies: [
      {
        id: 'anom-caf-1',
        title: 'Commercial Dishwasher Continuous Water Bypass',
        description: 'Conveyor dishwasher rinse cycle solenoid remained engaged post-wash cycle, wasting 24 L/min hot potable water.',
        severity: 'high',
        timestamp: 'Today, 01:20 PM',
        equipmentId: 'DSH-MAIN-01',
        evidenceValue: '24.2 L/min idle flow rate',
        baselineValue: '0.0 L/min when idle',
        possibleCause: 'Mineral scaling on pilot valve seat preventing spring return shut-off.',
      },
    ],
    sensors: [
      { id: 'SN-CAF-FLW-01', name: 'Commercial Dishwasher Hot Water Meter', type: 'flow_sensor', value: '24.2', unit: 'L/min', status: 'degraded', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-CAF-REF-01', name: 'Walk-In Freezer Compressor Telemetry', type: 'thermal_sensor', value: '-18.4', unit: '°C', status: 'online', isSimulated: true, lastReadingTime: 'Just now' },
      { id: 'SN-CAF-WST-01', name: 'Bio-Digester Daily Composting Scale', type: 'smart_meter', value: '410', unit: 'kg', status: 'online', isSimulated: true, lastReadingTime: '10m ago' },
    ],
    location: {
      zone: 'South Student Hub',
      floorCount: 2,
    },
  },
};

export const initialAlerts: Alert[] = [
  {
    id: 'ALT-1092',
    title: 'Critical Chilled Water Bypass in Science Lab',
    description: 'Continuous 48.5 L/min chilled water loss detected in Basement Cooling Loop B with zero demand signal from air handlers.',
    buildingId: 'laboratory',
    buildingName: 'Advanced Science Laboratory',
    severity: 'critical',
    status: 'active',
    category: 'water',
    timestamp: '2026-10-15T08:45:00Z',
    equipmentId: 'VLV-CWL-B04',
    sensorId: 'SN-LAB-CW-01',
    supportingReadings: [
      { metric: 'Differential Pressure', value: '1.9 bar', normalRange: '3.6 - 4.2 bar', deviation: '-51%' },
      { metric: 'Flow Rate', value: '48.5 L/min', normalRange: '0.0 L/min (Idle)', deviation: '+48.5 L/min' },
      { metric: 'Loop Return Temperature', value: '7.8 °C', normalRange: '12.0 - 14.5 °C', deviation: '-4.2 °C' },
      { metric: 'Acoustic Signature', value: '74 dB', normalRange: '< 45 dB', deviation: '+29 dB High-frequency hiss' },
    ],
    possibleCauses: [
      'Seat seal rupture or calcium buildup in 2-way motorized modulating valve',
      'Pneumatic supply air pressure drop causing actuator spring to rest semi-open',
      'Corrupted BMS analog output 0-10V signal locking actuator at 35% position',
    ],
    nextActions: [
      'Dispatch field technician to inspect valve stem mechanical position at Basement Zone B-12',
      'Manually exercise manual isolation valve ISO-CW-12 to verify if flow drops to zero',
      'Use thermal camera to confirm temperature gradient across valve body',
      'Ask EcoPilot to generate evidence-backed remediation protocol',
    ],
    recommendationId: 'REC-001',
  },
  {
    id: 'ALT-1088',
    title: 'Overnight Air Handler Short-Cycling in Engineering Block',
    description: 'Zone B Rooftop AHU-02 ran continuously between 2:30 AM and 5:45 AM while building occupancy was 0.',
    buildingId: 'engineering',
    buildingName: 'Engineering Block',
    severity: 'high',
    status: 'active',
    category: 'electricity',
    timestamp: '2026-10-15T04:15:00Z',
    equipmentId: 'AHU-ENG-02B',
    sensorId: 'SN-ENG-PWR-01',
    supportingReadings: [
      { metric: 'Power Draw', value: '68.4 kWh/hr', normalRange: '10.0 - 14.0 kWh/hr', deviation: '+415%' },
      { metric: 'Compressor Starts/Hr', value: '18 starts', normalRange: '< 4 starts/hr', deviation: '+350%' },
      { metric: 'Zone Occupancy Count', value: '0 persons', normalRange: '0 (Unoccupied)', deviation: '0' },
    ],
    possibleCauses: [
      'BMS scheduled override left active by weekend night maintenance team',
      'Faulty room temperature sensor reporting 32°C due to resistance drift',
      'Economizer outdoor damper stuck at 0% fresh air intake',
    ],
    nextActions: [
      'Audit BMS schedule overrides for Zone B HVAC controllers',
      'Calibrate thermistor probe at Room 304 Mechatronics Lab',
      'Review automated load scheduling with EcoPilot',
    ],
    recommendationId: 'REC-002',
  },
  {
    id: 'ALT-1084',
    title: 'Commercial Dishwasher Solenoid Leak in Dining Commons',
    description: 'Conveyor dishwasher rinse cycle valve fails to seat cleanly, leaking hot water continuously between meal services.',
    buildingId: 'cafeteria',
    buildingName: 'Campus Dining Commons',
    severity: 'high',
    status: 'investigating',
    category: 'water',
    timestamp: '2026-10-15T13:20:00Z',
    equipmentId: 'DSH-MAIN-01',
    sensorId: 'SN-CAF-FLW-01',
    supportingReadings: [
      { metric: 'Idle Flow Rate', value: '24.2 L/min', normalRange: '0.0 L/min', deviation: '+24.2 L/min' },
      { metric: 'Water Temperature', value: '64.5 °C', normalRange: 'Ambient (Idle)', deviation: '+42.5 °C' },
      { metric: 'Estimated Thermal Loss', value: '8.4 kWh/hr', normalRange: '0 kWh/hr', deviation: '+8.4 kWh/hr' },
    ],
    possibleCauses: [
      'Mineral debris lodged under solenoid diaphragm rubber seal',
      'Return spring fatigue in 24V ASCO brass solenoid valve',
    ],
    nextActions: [
      'Isolate local ball valve BV-CAF-DW01 prior to dinner rush',
      'Inspect and clean internal valve orifice or replace solenoid cartridge',
      'Record verification follow-up post repair',
    ],
  },
  {
    id: 'ALT-1079',
    title: 'Chemical Fume Hood Velocity Reduction',
    description: 'Exhaust Fume Hood #7 face velocity measured at 58 FPM, dropping below safe OSHA regulatory 80-100 FPM boundary.',
    buildingId: 'laboratory',
    buildingName: 'Advanced Science Laboratory',
    severity: 'high',
    status: 'active',
    category: 'equipment',
    timestamp: '2026-10-15T10:15:00Z',
    equipmentId: 'FHD-CHEM-07',
    sensorId: 'SN-LAB-FH-07',
    supportingReadings: [
      { metric: 'Face Velocity', value: '58 FPM', normalRange: '80 - 100 FPM', deviation: '-32%' },
      { metric: 'Sash Height', value: '18 inches', normalRange: '18 inches (Operational)', deviation: 'Normal' },
      { metric: 'Exhaust Static Pressure', value: '-0.38 in. w.g.', normalRange: '-0.75 to -0.90 in. w.g.', deviation: '-52%' },
    ],
    possibleCauses: [
      'VAV exhaust damper actuator slip on drive shaft',
      'Partially clogged HEPA or carbon pre-filter bed',
      'Roof exhaust fan belt tension loss',
    ],
    nextActions: [
      'Post temporary Safety Caution Notice on Fume Hood #7 sash',
      'Inspect roof exhaust stack EF-LAB-04 belt and variable frequency drive',
    ],
  },
  {
    id: 'ALT-1075',
    title: 'Rooftop Solar PV String Inverter Output Dip',
    description: 'Inverter 3 output is 22% lower than adjacent arrays under equivalent solar irradiance.',
    buildingId: 'engineering',
    buildingName: 'Engineering Block',
    severity: 'medium',
    status: 'resolved',
    category: 'electricity',
    timestamp: '2026-10-15T11:30:00Z',
    equipmentId: 'INV-PV-03',
    sensorId: 'SN-ENG-PV-03',
    supportingReadings: [
      { metric: 'Power Output', value: '31.2 kW', normalRange: '38.0 - 41.0 kW', deviation: '-22%' },
      { metric: 'Solar Irradiance', value: '820 W/m²', normalRange: '800 - 850 W/m²', deviation: 'Nominal' },
    ],
    possibleCauses: [
      'Dust layer shading String 4 south array',
      'Bypass diode thermal trip',
    ],
    nextActions: [
      'Wash PV modules on Row 4 and recalibrate string monitor',
    ],
    followUpId: 'FOL-091',
  },
];

export const initialRecommendations: SustainabilityRecommendation[] = [
  {
    id: 'REC-001',
    title: 'Overhaul Science Lab Chilled Water Valve & Install Auto-Bypass Limiter',
    description: 'Replace worn 4-inch modulating valve VLV-CWL-B04 with zero-leakage ceramic disc valve and configure BMS differential pressure threshold alarm.',
    buildingId: 'laboratory',
    buildingName: 'Advanced Science Laboratory',
    category: 'hvac',
    priority: 'critical',
    status: 'in_progress',
    projectedSavings: {
      waterLiters: 69840, // monthly
      kwh: 3420,
      co2eTons: 2.8,
      costSavingsMonthly: '$1,480 / month',
    },
    difficulty: 'Medium',
    paybackPeriod: '1.8 Months',
    assignee: 'Marcus Vance (Senior Facilities Lead)',
    deadline: '2026-10-22',
    verificationCriteria: 'Zero flow (< 0.2 L/min) confirmed on ultrasonic flowmeter when isolated; loop pressure restored to 3.8 - 4.1 bar.',
    isAiGenerated: true,
    steps: [
      'Schedule 2-hour chilling loop isolation during low lab occupancy window (18:00 - 20:00)',
      'Inspect actuator coupling and replace eroded valve seat cartridge with ceramic trim assembly',
      'Recalibrate 0-10V BMS analog output position feedback loop',
      'Conduct ultrasonic flow verification test and log readings in EcoTwin Follow-up module',
    ],
  },
  {
    id: 'REC-002',
    title: 'Dynamic Occupancy-Driven HVAC Night Setback for Engineering Wing',
    description: 'Integrate smart motion sensor telemetry into BMS schedule logic to automatically lock out air handling units when zero occupancy is detected between 22:00 and 06:00.',
    buildingId: 'engineering',
    buildingName: 'Engineering Block',
    category: 'energy',
    priority: 'high',
    status: 'todo',
    projectedSavings: {
      kwh: 4850,
      co2eTons: 3.9,
      costSavingsMonthly: '$890 / month',
    },
    difficulty: 'Easy',
    paybackPeriod: '0.5 Months',
    assignee: 'Priya Sharma (BMS Automation Specialist)',
    deadline: '2026-10-25',
    verificationCriteria: 'Overnight idle power draw maintained under 15 kWh/hr between 23:00 - 05:00 for 7 consecutive days.',
    isAiGenerated: true,
    steps: [
      'Export 30-day occupancy logs from RFID access turnstiles and ceiling PIR sensors',
      'Update BMS global sequence logic: assert setback mode after 30 minutes of zero occupancy',
      'Add manual 60-minute push-button override with automated reset for late-night research teams',
    ],
  },
  {
    id: 'REC-003',
    title: 'Cafeteria Dishwashing Water Recycling & Solenoid Replacement',
    description: 'Replace leaking ASCO solenoid on commercial conveyor washer and route final rinse drain into pre-wash tank counter-flow loop.',
    buildingId: 'cafeteria',
    buildingName: 'Campus Dining Commons',
    category: 'water',
    priority: 'high',
    status: 'todo',
    projectedSavings: {
      waterLiters: 34800,
      kwh: 1250,
      costSavingsMonthly: '$620 / month',
    },
    difficulty: 'Easy',
    paybackPeriod: '1.2 Months',
    assignee: 'David Chen (Plumbing Maintenance)',
    deadline: '2026-10-18',
    verificationCriteria: 'Zero continuous flow when washer is idle; 18% reduction in total culinary water intake.',
    isAiGenerated: false,
    steps: [
      'Disassemble and clean brass solenoid body, replace diaphragm kit D240-V',
      'Install in-line mesh strainer (60 mesh) upstream of valve to trap sediment particles',
      'Test idle flow with bucket catch test for 10 minutes',
    ],
  },
  {
    id: 'REC-004',
    title: 'Campus Central Library Bifacial PV Expansion & Battery Storage',
    description: 'Utilize 14,000 sq ft unshaded flat roof on Central Library to deploy 90kW bifacial solar array paired with 150kWh LiFePO4 battery bank.',
    buildingId: 'library',
    buildingName: 'Central Library',
    category: 'energy',
    priority: 'medium',
    status: 'todo',
    projectedSavings: {
      kwh: 11200,
      co2eTons: 9.1,
      costSavingsMonthly: '$2,150 / month',
    },
    difficulty: 'High',
    paybackPeriod: '3.4 Years',
    assignee: 'Sustainability Committee / Capex Board',
    deadline: '2026-12-15',
    verificationCriteria: 'Achieve 72% net-zero energy self-sufficiency for Library building during peak daylight hours.',
    isAiGenerated: false,
    steps: [
      'Complete structural load engineering audit for flat roof membrane',
      'Issue RFP for Tier-1 N-Type TOPCon bifacial panels',
      'Connect battery storage to campus micro-grid islanding controller',
    ],
  },
];

export const initialInspections: Inspection[] = [
  {
    id: 'INSP-2041',
    buildingId: 'laboratory',
    buildingName: 'Advanced Science Laboratory',
    zone: 'Basement Mechanical Room B-12',
    equipmentTag: 'VLV-CWL-B04',
    inspectorName: 'Marcus Vance',
    role: 'Senior Facilities Lead',
    timestamp: '2026-10-15T09:30:00Z',
    notes: 'On-site visual inspection confirmed physical water accumulation under 4-inch chilled water supply pipe. Insulation jacket is saturated. Moisture meter reading 94%.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    visionAnalysisStatus: 'completed',
    visionResult: {
      detectedIssue: 'Severe Flange Condensation & Actuator Packing Gland Leakage',
      confidence: 0.94,
      visualEvidence: 'Thermal discoloration and water pooling beneath pipe flange; mechanical valve stem indicates 35% displacement despite 0V command.',
      severityRecommendation: 'critical',
      recommendedActions: [
        'Isolate secondary chilled water supply valve immediately',
        'Repack stem gland or replace valve trim cartridge',
        'Inspect insulation for mold remediation',
      ],
    },
    status: 'under_review',
  },
  {
    id: 'INSP-2038',
    buildingId: 'engineering',
    buildingName: 'Engineering Block',
    zone: 'Rooftop Solar Array Section 4',
    equipmentTag: 'INV-PV-03',
    inspectorName: 'Sarah Jenkins',
    role: 'Renewable Energy Technician',
    timestamp: '2026-10-15T12:00:00Z',
    notes: 'Photographed dust and avian debris build-up across lower string panels on array row 4. Thermal camera showed localized hot-spot on junction box 4B.',
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=600&q=80',
    visionAnalysisStatus: 'completed',
    visionResult: {
      detectedIssue: 'Surface Soiling & Bypass Diode Thermal Hotspot',
      confidence: 0.88,
      visualEvidence: 'Visible dust accumulation obscuring bottom cell strings; thermal contrast of +14°C over adjacent cells.',
      severityRecommendation: 'medium',
      recommendedActions: [
        'Perform deionized water wash of array row 4',
        'Inspect bypass diode junction box for thermal degradation',
      ],
    },
    status: 'verified',
  },
];

export const initialFollowUps: FollowUp[] = [
  {
    id: 'FOL-091',
    alertId: 'ALT-1075',
    recommendationId: 'REC-002',
    buildingId: 'engineering',
    buildingName: 'Engineering Block',
    verifierName: 'Sarah Jenkins',
    role: 'Renewable Energy Technician',
    timestamp: '2026-10-15T12:45:00Z',
    preReading: '31.2 kW at 820 W/m² (22% deficit)',
    postReading: '39.6 kW at 825 W/m² (Within 1.5% of nominal)',
    status: 'verified_improved',
    notes: 'Modules washed using pure water scrub kit. Bypass diode junction box measured at 42°C (nominal). Inverter power generation fully restored.',
  },
];

// Persistent state singleton for the app session
class CampusDataStore {
  private buildings: Record<BuildingId, Building> = { ...initialBuildings };
  private alerts: Alert[] = [...initialAlerts];
  private recommendations: SustainabilityRecommendation[] = [...initialRecommendations];
  private inspections: Inspection[] = [...initialInspections];
  private followUps: FollowUp[] = [...initialFollowUps];
  private isSimulatedMode = true;

  getOverview(): CampusOverview {
    const bList = Object.values(this.buildings);
    const totalElec = bList.reduce((acc, b) => acc + b.resources.electricityKwh, 0);
    const totalSolar = bList.reduce((acc, b) => acc + b.resources.solarGenerationKwh, 0);
    const totalWater = bList.reduce((acc, b) => acc + b.resources.waterLiters, 0);
    const totalWaste = bList.reduce((acc, b) => acc + b.resources.wasteKg, 0);
    const totalCarbon = bList.reduce((acc, b) => acc + b.resources.carbonTons, 0);

    const activeAlerts = this.alerts.filter((a) => a.status === 'active' || a.status === 'investigating');
    const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
    const highCount = activeAlerts.filter((a) => a.severity === 'high').length;
    const mediumCount = activeAlerts.filter((a) => a.severity === 'medium').length;
    const lowCount = activeAlerts.filter((a) => a.severity === 'low').length;

    const avgEfficiency = +(bList.reduce((acc, b) => acc + b.efficiencyScore, 0) / bList.length).toFixed(1);

    return {
      overallEfficiencyScore: avgEfficiency,
      isSimulated: this.isSimulatedMode,
      dataSourceLabel: this.isSimulatedMode ? 'Simulated Lab Telemetry (Sample IoT Sensors)' : 'Live Campus SCADA Feed',
      lastUpdated: new Date().toISOString(),
      electricity: {
        currentKwh: +totalElec.toFixed(1),
        peakKwh: +(totalElec * 1.35).toFixed(1),
        gridKwh: +(totalElec - totalSolar).toFixed(1),
        solarKwh: +totalSolar.toFixed(1),
        changePercent: -4.2,
        unit: 'kWh',
      },
      water: {
        currentLiters: Math.round(totalWater),
        recycledLiters: Math.round(totalWater * 0.38),
        greywaterLiters: Math.round(totalWater * 0.24),
        recyclingRate: 38,
        changePercent: +2.1,
        unit: 'Liters',
      },
      waste: {
        currentKg: Math.round(totalWaste),
        diversionRate: 64,
        organicKg: Math.round(totalWaste * 0.52),
        recyclableKg: Math.round(totalWaste * 0.32),
        landfillKg: Math.round(totalWaste * 0.16),
        changePercent: -8.5,
        unit: 'kg',
      },
      carbon: {
        currentCo2e: +totalCarbon.toFixed(2),
        dailyNetCo2e: +(totalCarbon * 0.82).toFixed(2),
        reductionVsBaselinePercent: 16.4,
        changePercent: -5.1,
        unit: 'tCO2e',
      },
      alertsSummary: {
        total: activeAlerts.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      buildingRankings: bList.map((b) => ({
        id: b.id,
        name: b.name,
        efficiencyScore: b.efficiencyScore,
        activeAlerts: this.alerts.filter((a) => a.buildingId === b.id && (a.status === 'active' || a.status === 'investigating')).length,
        status: b.status,
        primaryAnomaly: b.anomalies[0]?.title,
      })),
    };
  }

  getBuildings(): Building[] {
    return Object.values(this.buildings);
  }

  getBuildingById(id: string): Building | null {
    return this.buildings[id as BuildingId] || null;
  }

  getAlerts(filters?: { severity?: string; buildingId?: string; status?: string }): Alert[] {
    return this.alerts.filter((alert) => {
      if (filters?.severity && filters.severity !== 'all' && alert.severity !== filters.severity) return false;
      if (filters?.buildingId && filters.buildingId !== 'all' && alert.buildingId !== filters.buildingId) return false;
      if (filters?.status && filters.status !== 'all' && alert.status !== filters.status) return false;
      return true;
    });
  }

  getAlertById(id: string): Alert | null {
    return this.alerts.find((a) => a.id === id) || null;
  }

  getRecommendations(): SustainabilityRecommendation[] {
    return this.recommendations;
  }

  updateRecommendationStatus(id: string, status: SustainabilityRecommendation['status']): SustainabilityRecommendation | null {
    const rec = this.recommendations.find((r) => r.id === id);
    if (!rec) return null;
    rec.status = status;
    return rec;
  }

  getInspections(): Inspection[] {
    return this.inspections;
  }

  addInspection(data: Omit<Inspection, 'id' | 'timestamp' | 'status'>): Inspection {
    const newInspection: Inspection = {
      ...data,
      id: `INSP-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      status: 'submitted',
    };
    this.inspections.unshift(newInspection);
    return newInspection;
  }

  getFollowUps(): FollowUp[] {
    return this.followUps;
  }

  addFollowUp(data: Omit<FollowUp, 'id' | 'timestamp'>): FollowUp {
    const newFollowUp: FollowUp = {
      ...data,
      id: `FOL-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
    };
    this.followUps.unshift(newFollowUp);

    // If linked to an alert, update the alert status based on verification outcome
    if (data.alertId) {
      const alert = this.alerts.find((a) => a.id === data.alertId);
      if (alert) {
        if (data.status === 'verified_improved') {
          alert.status = 'resolved';
        } else if (data.status === 'requires_rework') {
          alert.status = 'active';
        } else {
          alert.status = 'investigating';
        }
        alert.followUpId = newFollowUp.id;

        // Recalculate building status
        const buildingAlerts = this.alerts.filter((a) => a.buildingId === alert.buildingId && (a.status === 'active' || a.status === 'investigating'));
        const building = this.buildings[alert.buildingId];
        if (building) {
          building.activeAlertsCount = buildingAlerts.length;
          if (buildingAlerts.some((a) => a.severity === 'critical')) {
            building.status = 'critical';
          } else if (buildingAlerts.length > 0) {
            building.status = 'warning';
          } else {
            building.status = 'normal';
            building.efficiencyScore = Math.min(98, building.efficiencyScore + 6);
          }
        }
      }
    }

    // If linked to recommendation, update recommendation status
    if (data.recommendationId) {
      const rec = this.recommendations.find((r) => r.id === data.recommendationId);
      if (rec) {
        if (data.status === 'verified_improved') {
          rec.status = 'completed';
        } else if (data.status === 'requires_rework') {
          rec.status = 'in_progress';
        } else {
          rec.status = 'verified';
        }
      }
    }

    return newFollowUp;
  }

  generateReport(dateRange: { start: string; end: string; label: string }, buildingFilter: string): SustainabilityReport {
    const bList = buildingFilter === 'all'
      ? Object.values(this.buildings)
      : Object.values(this.buildings).filter((b) => b.id === buildingFilter);

    const totalKwhSaved = 14250;
    const totalWaterSaved = 104640;
    const totalCo2Avoided = 15.8;
    const totalCostSaved = '$4,620';

    return {
      id: `REP-${Date.now().toString(36).toUpperCase()}`,
      title: `Campus Sustainability Audit & Decarbonization Report (${dateRange.label})`,
      generatedAt: new Date().toISOString(),
      dateRange,
      buildingFilter,
      summary: {
        totalKwhSaved,
        totalWaterSavedLiters: totalWaterSaved,
        totalCo2AvoidedTons: totalCo2Avoided,
        estimatedCostSaved: totalCostSaved,
        alertsResolvedCount: this.alerts.filter((a) => a.status === 'resolved').length,
        followUpsLogged: this.followUps.length,
      },
      buildingBreakdown: bList.map((b) => ({
        buildingId: b.id,
        buildingName: b.name,
        efficiencyScore: b.efficiencyScore,
        electricityKwh: b.resources.electricityKwh,
        waterLiters: b.resources.waterLiters,
        activeAlerts: this.alerts.filter((a) => a.buildingId === b.id && (a.status === 'active' || a.status === 'investigating')).length,
      })),
      keyRecommendations: this.recommendations.slice(0, 3).map((r) => `${r.title} (${r.buildingName}) - Projected: ${r.projectedSavings.costSavingsMonthly || 'High ROI'}`),
      followUpAuditTrail: this.followUps.map((f) => ({
        id: f.id,
        verifier: f.verifierName,
        building: f.buildingName,
        outcome: f.status === 'verified_improved' ? 'Verified Improved' : f.status === 'inconclusive' ? 'Inconclusive' : 'Requires Re-work',
        date: f.timestamp.split('T')[0],
      })),
    };
  }

  setSimulatedMode(enabled: boolean) {
    this.isSimulatedMode = enabled;
  }

  isSimulated(): boolean {
    return this.isSimulatedMode;
  }
}

// Global variable for development persistence in Next.js
const globalForData = globalThis as unknown as { campusDataStore?: CampusDataStore };
export const dataStore = globalForData.campusDataStore ?? new CampusDataStore();
if (process.env.NODE_ENV !== 'production') globalForData.campusDataStore = dataStore;
