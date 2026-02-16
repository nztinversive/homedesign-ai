'use client';

import { useMemo, useState } from 'react';
import PlanCard from './PlanCard';
import type { PlanScore, PlacedPlan } from '@/lib/constraint-engine/types';

type SortMode = 'score' | 'sqftAccuracy';

interface PlanGalleryProps {
  plans: PlacedPlan[];
  scores: PlanScore[];
  selectedPlanIndex: number;
  onSelectPlan: (index: number) => void;
}

export default function PlanGallery({ plans, scores, selectedPlanIndex, onSelectPlan }: PlanGalleryProps) {
  const [sortMode, setSortMode] = useState<SortMode>('score');

  const sortedIndices = useMemo(() => {
    const indices = plans.map((_, index) => index);
    indices.sort((a, b) => {
      if (sortMode === 'sqftAccuracy') {
        return scores[b].sqftAccuracy - scores[a].sqftAccuracy;
      }
      return scores[b].overall - scores[a].overall;
    });
    return indices;
  }, [plans, scores, sortMode]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-cream">Plan Gallery</h2>
        <label className="flex items-center gap-2 text-sm text-cream">
          Sort by
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="rounded border border-[#4A3F2D] bg-[#1A160F] px-2 py-1 text-sm text-cream"
          >
            <option value="score">Overall Score</option>
            <option value="sqftAccuracy">Sqft Accuracy</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedIndices.map((planIndex) => (
          <PlanCard
            key={`${plans[planIndex].metadata.strategy}-${planIndex}`}
            plan={plans[planIndex]}
            score={scores[planIndex]}
            selected={planIndex === selectedPlanIndex}
            onSelect={() => onSelectPlan(planIndex)}
          />
        ))}
      </div>
    </section>
  );
}
