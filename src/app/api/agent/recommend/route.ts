import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/mock-data';
import { AgentRecommendation } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alertId, buildingId, focusArea } = body;

    const alert = alertId ? dataStore.getAlertById(alertId) : null;
    const building = buildingId ? dataStore.getBuildingById(buildingId) : null;

    let recommendation: AgentRecommendation;

    if (alert?.id === 'ALT-1092' || alert?.category === 'water' || focusArea === 'water') {
      recommendation = {
        id: `REC-${Date.now().toString(36)}`,
        title: 'Overhaul Valve VLV-CWL-B04 Trim & Lock In Ultrasonic Metering',
        impact: 'Halts 48.5 L/min continuous chilled water loss. Recovers $1,480 monthly energy & thermal cost.',
        effort: 'Medium',
        priority: 'critical',
        estimatedSavings: '$1,480/month & 3,420 kWh/month',
        steps: [
          { stepNumber: 1, instruction: 'Manually close local quarter-turn isolation ball valve ISO-CW-12 in Mechanical Room B-12.', expectedOutcome: 'Flow rate must drop immediately from 48.5 L/min to 0.0 L/min.' },
          { stepNumber: 2, instruction: 'Isolate pneumatic actuator and test spring return seal pressure with calibrated pressure gauge.', expectedOutcome: 'Verify minimum 2.4 bar spring seating force.' },
          { stepNumber: 3, instruction: 'Replace damaged Teflon trim disc with stainless ceramic disc assembly.', expectedOutcome: 'Achieve ANSI Class VI bubble-tight shutoff.' },
          { stepNumber: 4, instruction: 'Log baseline comparison in Follow-up module.', expectedOutcome: 'Alert ALT-1092 marked as verified and resolved.' },
        ],
      };
    } else if (alert?.category === 'electricity' || focusArea === 'energy') {
      recommendation = {
        id: `REC-${Date.now().toString(36)}`,
        title: 'Dynamic BMS Night Lockout Sequence Implementation',
        impact: 'Eliminates 68.4 kWh/hr idle night cycling. Prevents premature compressor failure.',
        effort: 'Low',
        priority: 'high',
        estimatedSavings: '$890/month & 4,850 kWh/month',
        steps: [
          { stepNumber: 1, instruction: 'Access BMS controller and purge stale manual override commands on AHU-02B.', expectedOutcome: 'Compressor cycling drops to 0 starts/hr when unoccupied.' },
          { stepNumber: 2, instruction: 'Bind room PIR motion sensors to AHU enable contactor with 30-min run-down delay.', expectedOutcome: 'Automatic shutdown enforced during zero occupancy.' },
          { stepNumber: 3, instruction: 'Verify 24h electrical draw curve on smart meter dashboard.', expectedOutcome: 'Overnight power stays strictly under 14 kWh/hr.' },
        ],
      };
    } else {
      recommendation = {
        id: `REC-${Date.now().toString(36)}`,
        title: `Comprehensive Sustainability Optimization for ${building?.name || 'Target Facility'}`,
        impact: 'Combines occupancy-based lighting dimming, HVAC setpoint expansion (21°C to 23°C), and water aerators.',
        effort: 'Low',
        priority: 'medium',
        estimatedSavings: '$450/month & 1,800 kWh/month',
        steps: [
          { stepNumber: 1, instruction: 'Audit thermostat deadband settings across all floors.', expectedOutcome: 'Expand deadband from ±1.0°C to ±2.0°C.' },
          { stepNumber: 2, instruction: 'Inspect faucet aerator flow rates in all restrooms.', expectedOutcome: 'Replace with 0.5 GPM pressure-compensating aerators.' },
        ],
      };
    }

    return NextResponse.json({ data: recommendation, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error generating recommendation';
    return NextResponse.json(
      { data: null, error: { code: 'RECOMMENDATION_FAILED', message } },
      { status: 500 }
    );
  }
}
