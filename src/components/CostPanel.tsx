'use client';

import { useMemo } from 'react';
import type { PlacedPlan, WallAnalysis } from '@/lib/constraint-engine/types';
import { estimateCost } from '@/lib/cost-estimator';

interface CostPanelProps {
  plan: PlacedPlan;
  walls: WallAnalysis;
}

const BREAKDOWN_ORDER: Array<{
  key: keyof ReturnType<typeof estimateCost>['breakdown'];
  label: string;
  color: string;
}> = [
  { key: 'structure', label: 'Structure', color: '#B8860B' },
  { key: 'walls', label: 'Walls', color: '#C79A27' },
  { key: 'plumbing', label: 'Plumbing', color: '#8C6A1F' },
  { key: 'windows', label: 'Windows', color: '#D5B15A' },
  { key: 'doors', label: 'Doors', color: '#9C7931' },
  { key: 'extras', label: 'Extras', color: '#E0BC6B' },
];

const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function CostPanel({ plan, walls }: CostPanelProps) {
  const estimate = useMemo(() => estimateCost(plan, walls), [plan, walls]);

  return (
    <section className="space-y-4 rounded-lg border border-[#5A451E] bg-[#15130f] p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#CFBE99]">Estimated Cost</p>
          <p className="mt-2 text-4xl font-bold text-[#F2D28B]">{MONEY_FORMATTER.format(estimate.totalEstimate)}</p>
        </div>
        <span className="rounded-full border border-[#B8860B] bg-[#2A2214] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#E6C77D]">
          {estimate.confidence === 'rough' ? 'Rough Estimate' : 'Moderate Estimate'}
        </span>
      </div>

      <div className="space-y-3">
        {BREAKDOWN_ORDER.map((item) => {
          const value = estimate.breakdown[item.key];
          const percent = estimate.totalEstimate > 0 ? (value / estimate.totalEstimate) * 100 : 0;

          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-cream">{item.label}</p>
                <p className="text-sm font-semibold text-[#E7D7B5]">{MONEY_FORMATTER.format(value)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#2A241A]">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-[#3C3221] bg-[#1A170F] px-3 py-2 text-sm">
        <p className="text-[#D7C49E]">
          Per sqft: <span className="font-semibold text-[#F2D28B]">{MONEY_FORMATTER.format(estimate.perSqft)}</span>
        </p>
      </div>

      <p className="text-xs text-[#B9A98A]">Estimates are approximate. Actual costs vary by region and specifications.</p>
    </section>
  );
}
