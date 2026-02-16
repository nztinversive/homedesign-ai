'use client';

import { useState } from 'react';
import type { Direction, LotConstraints } from '@/lib/constraint-engine/types';

interface LotConstraintsPanelProps {
  lot: LotConstraints;
  onChange: (lot: LotConstraints) => void;
}

function normalizeNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function LotConstraintsPanel({ lot, onChange }: LotConstraintsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateNumber = (key: keyof LotConstraints, value: string) => {
    const numeric = normalizeNumber(value, lot[key] as number);
    onChange({
      ...lot,
      [key]: Math.max(0, Math.round(numeric)),
    });
  };

  return (
    <section className="rounded-lg border border-dark-border bg-[#1A160F]">
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold text-cream transition hover:bg-[#221c14]"
      >
        <span>Advanced: Lot Constraints</span>
        <span className="text-[#B8860B]">{isExpanded ? '-' : '+'}</span>
      </button>

      {isExpanded ? (
        <div className="space-y-4 border-t border-dark-border px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Lot Max Width (ft)</span>
              <input
                type="number"
                min={10}
                value={lot.maxWidth}
                onChange={(event) => updateNumber('maxWidth', event.target.value)}
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Lot Max Depth (ft)</span>
              <input
                type="number"
                min={10}
                value={lot.maxDepth}
                onChange={(event) => updateNumber('maxDepth', event.target.value)}
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Front Setback (ft)</span>
              <input
                type="number"
                min={0}
                value={lot.setbackFront}
                onChange={(event) => updateNumber('setbackFront', event.target.value)}
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Side Setback (ft)</span>
              <input
                type="number"
                min={0}
                value={lot.setbackSide}
                onChange={(event) => updateNumber('setbackSide', event.target.value)}
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Rear Setback (ft)</span>
              <input
                type="number"
                min={0}
                value={lot.setbackRear}
                onChange={(event) => updateNumber('setbackRear', event.target.value)}
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Entry Facing</span>
              <select
                value={lot.entryFacing}
                onChange={(event) =>
                  onChange({
                    ...lot,
                    entryFacing: event.target.value as Direction,
                  })
                }
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              >
                <option value="north">North (N)</option>
                <option value="south">South (S)</option>
                <option value="east">East (E)</option>
                <option value="west">West (W)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Garage Position</span>
              <select
                value={lot.garagePosition ?? 'none'}
                onChange={(event) =>
                  onChange({
                    ...lot,
                    garagePosition: event.target.value as LotConstraints['garagePosition'],
                  })
                }
                className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="rear">Rear</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}
