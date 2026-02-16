'use client';

import FloorPlanSVG from './FloorPlanSVG';
import type { PlanScore, PlacedPlan } from '@/lib/constraint-engine/types';

interface PlanCardProps {
  plan: PlacedPlan;
  score: PlanScore;
  selected: boolean;
  onSelect: () => void;
}

function scoreColor(value: number): string {
  if (value > 75) {
    return '#4CAF50';
  }
  if (value >= 50) {
    return '#B8860B';
  }
  return '#C0392B';
}

export default function PlanCard({ plan, score, selected, onSelect }: PlanCardProps) {
  const totalSqft = plan.rooms.reduce((sum, room) => sum + room.sqft, 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full space-y-3 rounded-lg border p-3 text-left transition ${
        selected ? 'border-[#B8860B] bg-[#221d14]' : 'border-dark-border bg-dark-card hover:border-[#876326]'
      }`}
    >
      <FloorPlanSVG plan={plan} width={300} height={200} showGrid={false} showLabels={false} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cream">{plan.metadata.strategy}</p>
          <p className="text-xs text-[#C2B69F]">
            {totalSqft} sqft • {plan.rooms.length} rooms
          </p>
        </div>
        <span
          className="rounded px-2 py-1 text-sm font-bold"
          style={{ backgroundColor: `${scoreColor(score.overall)}22`, color: scoreColor(score.overall) }}
        >
          {Math.round(score.overall)}
        </span>
      </div>
    </button>
  );
}
