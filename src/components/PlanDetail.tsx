'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import FloorPlanSVG from './FloorPlanSVG';
import ScorePanel from './ScorePanel';
import type { PlanScore, PlacedPlan, Zone } from '@/lib/constraint-engine/types';

const ZONE_BADGE_COLORS: Record<Zone, string> = {
  social: '#4A90D9',
  private: '#7B68EE',
  service: '#F5A623',
  garage: '#8B8B8B',
  exterior: '#4CAF50',
  circulation: '#A9A9A9',
};

interface PlanDetailProps {
  plan: PlacedPlan;
  score: PlanScore;
  onRegenerate: () => void;
  onEditBrief: () => void;
}

function zoneLabel(zone: Zone): string {
  return zone.charAt(0).toUpperCase() + zone.slice(1);
}

function sanitizeFilenameSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

export default function PlanDetail({ plan, score, onRegenerate, onEditBrief }: PlanDetailProps) {
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null);
  const svgId = useId().replace(/:/g, '');

  useEffect(() => {
    setHighlightRoomId(null);
  }, [plan]);

  const sortedRooms = useMemo(
    () =>
      [...plan.rooms].sort((a, b) => {
        if (a.floor !== b.floor) {
          return a.floor - b.floor;
        }
        if (a.y !== b.y) {
          return a.y - b.y;
        }
        return a.x - b.x;
      }),
    [plan.rooms],
  );

  const exportSvg = () => {
    const svgNode = document.getElementById(svgId) as SVGSVGElement | null;
    if (!svgNode) {
      return;
    }

    const serializer = new XMLSerializer();
    let svgText = serializer.serializeToString(svgNode);
    if (!svgText.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgText = svgText.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `home-plan-${sanitizeFilenameSegment(plan.metadata.strategy)}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[7fr_3fr]">
      <div className="space-y-4">
        <FloorPlanSVG
          plan={plan}
          width={1000}
          height={720}
          showGrid
          showLabels
          svgId={svgId}
          highlightRoomId={highlightRoomId}
          onRoomClick={(roomId) => setHighlightRoomId(roomId)}
        />
      </div>

      <aside className="space-y-4">
        <ScorePanel score={score} />

        <section className="space-y-3 rounded-lg border border-dark-border bg-dark-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#CAB89B]">Rooms</h3>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {sortedRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setHighlightRoomId(room.id)}
                className={`flex w-full items-center justify-between rounded border px-2 py-2 text-left transition ${
                  room.id === highlightRoomId
                    ? 'border-[#B8860B] bg-[#2A2216]'
                    : 'border-[#3D3426] bg-[#1A160F] hover:border-[#7A5C2A]'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-cream">{room.label}</p>
                  <p className="text-xs text-[#BFAF95]">
                    {room.sqft} sqft • Floor {room.floor}
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-1 text-xs font-semibold text-[#15130f]"
                  style={{ backgroundColor: ZONE_BADGE_COLORS[room.zone] }}
                >
                  {zoneLabel(room.zone)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded border border-[#B8860B] bg-[#B8860B] px-3 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CC9714]"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onEditBrief}
            className="rounded border border-[#6A5B42] bg-[#201A13] px-3 py-2 text-sm text-cream transition hover:border-[#B8860B]"
          >
            Edit Brief
          </button>
          <button
            type="button"
            onClick={exportSvg}
            className="rounded border border-[#6A5B42] bg-[#201A13] px-3 py-2 text-sm text-cream transition hover:border-[#B8860B]"
          >
            Export SVG
          </button>
        </div>
      </aside>
    </section>
  );
}
