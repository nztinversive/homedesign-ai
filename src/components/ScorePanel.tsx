'use client';

import ScoreBar from './ScoreBar';
import type { PlanScore } from '@/lib/constraint-engine/types';

interface ScorePanelProps {
  score: PlanScore;
}

const METRIC_CONFIG: Array<{ key: keyof PlanScore; label: string }> = [
  { key: 'adjacencySatisfaction', label: 'Adjacency Satisfaction' },
  { key: 'zoneCohesion', label: 'Zone Cohesion' },
  { key: 'naturalLight', label: 'Natural Light' },
  { key: 'plumbingEfficiency', label: 'Plumbing Efficiency' },
  { key: 'circulationQuality', label: 'Circulation Quality' },
  { key: 'spaceUtilization', label: 'Space Utilization' },
  { key: 'privacyGradient', label: 'Privacy Gradient' },
  { key: 'overallBuildability', label: 'Overall Buildability' },
];

function scoreColor(value: number): string {
  if (value > 75) {
    return '#4CAF50';
  }
  if (value >= 50) {
    return '#B8860B';
  }
  return '#C0392B';
}

export default function ScorePanel({ score }: ScorePanelProps) {
  const overallRounded = Math.round(score.overall);

  return (
    <section className="space-y-5 rounded-lg border border-dark-border bg-dark-card p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#CDBB97]">Overall Score</p>
        <p className="mt-2 text-5xl font-bold" style={{ color: scoreColor(score.overall) }}>
          {overallRounded}
        </p>
      </div>

      <div className="space-y-4">
        {METRIC_CONFIG.map((metric) => (
          <ScoreBar key={metric.key} label={metric.label} score={score[metric.key] as number} />
        ))}
      </div>
    </section>
  );
}
