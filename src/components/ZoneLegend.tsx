'use client';

const ZONES = [
  { label: 'Social', color: '#4A90D9' },
  { label: 'Private', color: '#7B68EE' },
  { label: 'Service', color: '#F5A623' },
  { label: 'Garage', color: '#8B8B8B' },
  { label: 'Exterior', color: '#4CAF50' },
  { label: 'Circulation', color: '#D3D3D3' },
] as const;

export default function ZoneLegend() {
  return (
    <section className="rounded-lg border border-dark-border bg-dark-card px-4 py-3">
      <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[#CAB89B]">Zone Legend</p>
      <div className="flex flex-wrap items-center gap-3">
        {ZONES.map((zone) => (
          <div key={zone.label} className="flex items-center gap-2 rounded border border-[#3D3426] bg-[#1A160F] px-2.5 py-1.5">
            <span className="h-3 w-3 rounded-sm border border-[#2D281F]" style={{ backgroundColor: zone.color }} />
            <span className="text-xs font-medium text-cream">{zone.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
