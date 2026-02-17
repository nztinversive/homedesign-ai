'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import CostPanel from './CostPanel';
import FloorPlanSVG from './FloorPlanSVG';
import ScorePanel from './ScorePanel';
import ZoneLegend from './ZoneLegend';
import type { PlanScore, PlacedPlan, WallAnalysis, Zone, DesignBrief, GeneratedPlan } from '@/lib/constraint-engine/types';

const ZONE_BADGE_COLORS: Record<Zone, string> = {
  social: '#4A90D9',
  private: '#7B68EE',
  service: '#F5A623',
  garage: '#8B8B8B',
  exterior: '#4CAF50',
  circulation: '#A9A9A9',
};

type LayerKey = 'grid' | 'dimensions' | 'labels' | 'doors' | 'windows';

interface PlanDetailProps {
  plan: PlacedPlan;
  walls: WallAnalysis;
  score: PlanScore;
  brief?: DesignBrief;
  onRegenerate: () => void;
  onEditBrief: () => void;
}

function zoneLabel(zone: Zone): string {
  return zone.charAt(0).toUpperCase() + zone.slice(1);
}

function sanitizeFilenameSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

function LayerIcon({ layer }: { layer: LayerKey }) {
  if (layer === 'grid') {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path d="M1.5 1.5H13.5V13.5H1.5V1.5ZM5 1.5V13.5M10 1.5V13.5M1.5 5H13.5M1.5 10H13.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }

  if (layer === 'dimensions') {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path d="M2 4.5H13M2 10.5H13M4 2.5V12.5M11 2.5V12.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }

  if (layer === 'labels') {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path d="M3 3H12M7.5 3V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (layer === 'doors') {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path d="M2 11.5H13M2.5 11.5V4.5M2.5 4.5H9.5M9.5 4.5V11.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M9.5 4.5C12 6 12.4 8.8 9.5 11.5" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }

  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="11" height="7" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M2 7.5H13" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export default function PlanDetail({ plan, walls, score, brief, onRegenerate, onEditBrief }: PlanDetailProps) {
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showDoors, setShowDoors] = useState(true);
  const [showWindows, setShowWindows] = useState(true);
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
    <section className="flex flex-col gap-4 lg:grid lg:grid-cols-[7fr_3fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dark-border bg-dark-card p-2">
          <button
            type="button"
            title="Toggle grid"
            onClick={() => setShowGrid((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition ${
              showGrid
                ? 'border-[#B8860B] bg-[#B8860B] text-[#15130f]'
                : 'border-[#4A3F2D] bg-[#1A160F] text-[#D0BD9A] hover:border-[#B8860B]'
            }`}
            aria-label="Toggle grid"
          >
            <LayerIcon layer="grid" />
          </button>

          <button
            type="button"
            title="Toggle dimensions"
            onClick={() => setShowDimensions((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition ${
              showDimensions
                ? 'border-[#B8860B] bg-[#B8860B] text-[#15130f]'
                : 'border-[#4A3F2D] bg-[#1A160F] text-[#D0BD9A] hover:border-[#B8860B]'
            }`}
            aria-label="Toggle dimensions"
          >
            <LayerIcon layer="dimensions" />
          </button>

          <button
            type="button"
            title="Toggle labels"
            onClick={() => setShowLabels((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition ${
              showLabels
                ? 'border-[#B8860B] bg-[#B8860B] text-[#15130f]'
                : 'border-[#4A3F2D] bg-[#1A160F] text-[#D0BD9A] hover:border-[#B8860B]'
            }`}
            aria-label="Toggle labels"
          >
            <LayerIcon layer="labels" />
          </button>

          <button
            type="button"
            title="Toggle doors"
            onClick={() => setShowDoors((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition ${
              showDoors
                ? 'border-[#B8860B] bg-[#B8860B] text-[#15130f]'
                : 'border-[#4A3F2D] bg-[#1A160F] text-[#D0BD9A] hover:border-[#B8860B]'
            }`}
            aria-label="Toggle doors"
          >
            <LayerIcon layer="doors" />
          </button>

          <button
            type="button"
            title="Toggle windows"
            onClick={() => setShowWindows((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition ${
              showWindows
                ? 'border-[#B8860B] bg-[#B8860B] text-[#15130f]'
                : 'border-[#4A3F2D] bg-[#1A160F] text-[#D0BD9A] hover:border-[#B8860B]'
            }`}
            aria-label="Toggle windows"
          >
            <LayerIcon layer="windows" />
          </button>
        </div>

        <FloorPlanSVG
          plan={plan}
          width={1000}
          height={720}
          showGrid={showGrid}
          showLabels={showLabels}
          showDimensions={showDimensions}
          showDoors={showDoors}
          showWindows={showWindows}
          svgId={svgId}
          highlightRoomId={highlightRoomId}
          onRoomClick={(roomId) => setHighlightRoomId(roomId)}
        />

        <ZoneLegend />
      </div>

      <aside className="space-y-4">
        <ScorePanel score={score} />
        <CostPanel plan={plan} walls={walls} />

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
                    {room.sqft} sqft | Floor {room.floor}
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
          {brief && (
            <button
              type="button"
              onClick={async () => {
                const { downloadPlanPDF } = await import('./PlanPDF');
                const genPlan: GeneratedPlan = {
                  envelope: plan.envelope,
                  rooms: plan.rooms,
                  walls: walls.walls,
                  doors: plan.doors,
                  windows: plan.windows ?? [],
                  circulation: plan.circulation,
                  score,
                  metadata: {
                    generationTimeMs: 0,
                    seed: 0,
                    variationStrategy: plan.metadata?.strategy ?? 'default',
                  },
                };
                downloadPlanPDF(genPlan, brief);
              }}
              className="col-span-full rounded border border-[#B8860B] bg-[#201A13] px-3 py-2 text-sm text-[#C9A84C] transition hover:bg-[#2A2216]"
            >
              📄 Export PDF
            </button>
          )}
        </div>
      </aside>
    </section>
  );
}
