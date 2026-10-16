import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoTwin AI — Campus Sustainability & Decarbonization Command Center',
  description:
    'Enterprise-grade campus sustainability digital twin and facility analytics platform. Features SCADA telemetry, predictive anomaly detection, architectural site visualization, and evidence-grounded AI decision support.',
  keywords: [
    'Smart Campus',
    'Enterprise Sustainability',
    'Facility Analytics',
    'Decarbonization',
    'SCADA IoT Telemetry',
    'EcoPilot AI',
    'Energy Management',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <meta name="theme-color" content="#F8F9FA" />
      </head>
      <body className="min-h-screen bg-[#F8F9FA] text-charcoal-900 font-sans">
        {children}
      </body>
    </html>
  );
}
