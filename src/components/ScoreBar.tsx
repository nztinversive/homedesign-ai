'use client';

import { useEffect, useState } from 'react';

interface ScoreBarProps {
  label: string;
  score: number;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

export default function ScoreBar({ label, score }: ScoreBarProps) {
  const bounded = clampScore(score);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedScore(bounded));
    return () => cancelAnimationFrame(frame);
  }, [bounded]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-cream">{label}</span>
        <span className="text-sm font-semibold text-cream">{Math.round(bounded)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#2A241A]">
        <div
          className="h-full rounded-full bg-[#B8860B] transition-all duration-500 ease-out"
          style={{ width: `${animatedScore}%` }}
        />
      </div>
    </div>
  );
}
