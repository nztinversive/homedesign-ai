'use client';

import { useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, Ref } from 'react';
import type { PlacedPlan, PlacedRoom, Zone } from '@/lib/constraint-engine/types';

const ZONE_FILLS: Record<Zone, string> = {
  social: '#4A90D9',
  private: '#7B68EE',
  service: '#F5A623',
  garage: '#8B8B8B',
  exterior: '#4CAF50',
  circulation: '#E0E0E0',
};

const ZONE_LABELS: Record<Zone, string> = {
  social: 'Social',
  private: 'Private',
  service: 'Service',
  garage: 'Garage',
  exterior: 'Exterior',
  circulation: 'Circulation',
};

interface SVGGridProps {
  x: number;
  y: number;
  width: number;
  depth: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

function SVGGrid({ x, y, width, depth, scale, offsetX, offsetY }: SVGGridProps) {
  const verticalLines: number[] = [];
  const horizontalLines: number[] = [];

  for (let lineX = x; lineX <= x + width; lineX += 1) {
    verticalLines.push(lineX);
  }
  for (let lineY = y; lineY <= y + depth; lineY += 1) {
    horizontalLines.push(lineY);
  }

  const toPxX = (value: number) => offsetX + (value - x) * scale;
  const toPxY = (value: number) => offsetY + (value - y) * scale;
  const right = toPxX(x + width);
  const bottom = toPxY(y + depth);

  return (
    <g aria-hidden="true">
      {verticalLines.map((lineX) => (
        <line
          key={`grid-x-${lineX}`}
          x1={toPxX(lineX)}
          y1={toPxY(y)}
          x2={toPxX(lineX)}
          y2={bottom}
          stroke="#B8C3CF"
          strokeWidth={0.75}
          strokeOpacity={0.3}
        />
      ))}
      {horizontalLines.map((lineY) => (
        <line
          key={`grid-y-${lineY}`}
          x1={toPxX(x)}
          y1={toPxY(lineY)}
          x2={right}
          y2={toPxY(lineY)}
          stroke="#B8C3CF"
          strokeWidth={0.75}
          strokeOpacity={0.3}
        />
      ))}
    </g>
  );
}

interface SVGRoomProps {
  room: PlacedRoom;
  scale: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  showLabels: boolean;
  isHighlighted: boolean;
  onMouseEnter: (event: ReactMouseEvent<SVGRectElement>, room: PlacedRoom) => void;
  onMouseMove: (event: ReactMouseEvent<SVGRectElement>, room: PlacedRoom) => void;
  onMouseLeave: () => void;
  onClick: (roomId: string) => void;
}

function SVGRoom({
  room,
  scale,
  offsetX,
  offsetY,
  originX,
  originY,
  showLabels,
  isHighlighted,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onClick,
}: SVGRoomProps) {
  const x = offsetX + (room.x - originX) * scale;
  const y = offsetY + (room.y - originY) * scale;
  const width = room.width * scale;
  const height = room.depth * scale;
  const textColor = room.zone === 'circulation' ? '#333333' : '#ffffff';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        fill={ZONE_FILLS[room.zone]}
        fillOpacity={0.92}
        stroke={isHighlighted ? '#B8860B' : '#2F2A22'}
        strokeWidth={isHighlighted ? 3 : 1.5}
        className="cursor-pointer transition-all"
        onMouseEnter={(event) => onMouseEnter(event, room)}
        onMouseMove={(event) => onMouseMove(event, room)}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(room.id)}
      />
      {showLabels ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          className="pointer-events-none select-none"
          style={{ fontSize: `${Math.max(11, Math.min(15, Math.min(width, height) / 4))}px`, fontWeight: 600 }}
        >
          <tspan x={x + width / 2} dy={-6}>
            {room.label}
          </tspan>
          <tspan x={x + width / 2} dy={14} style={{ fontSize: '11px', fontWeight: 500 }}>
            {room.sqft} sqft
          </tspan>
        </text>
      ) : null}
    </g>
  );
}

interface FloorPlanSVGProps {
  plan: PlacedPlan;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  highlightRoomId?: string | null;
  onRoomClick?: (roomId: string) => void;
  onRoomHover?: (roomId: string | null) => void;
  svgId?: string;
  svgRef?: Ref<SVGSVGElement>;
}

interface TooltipState {
  room: PlacedRoom;
  x: number;
  y: number;
}

export default function FloorPlanSVG({
  plan,
  width = 800,
  height = 600,
  showGrid = true,
  showLabels = true,
  highlightRoomId = null,
  onRoomClick,
  onRoomHover,
  svgId,
  svgRef,
}: FloorPlanSVGProps) {
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const highlightedRoom = useMemo(
    () => plan.rooms.find((room) => room.id === highlightRoomId) ?? null,
    [plan.rooms, highlightRoomId],
  );
  const visibleFloor = highlightedRoom?.floor ?? 1;
  const floorRect = plan.envelope.floorRects[visibleFloor] ?? plan.envelope.footprint;
  const floorRooms = plan.rooms.filter((room) => room.floor === visibleFloor);
  const roomsToRender = floorRooms.length > 0 ? floorRooms : plan.rooms;

  const viewport = useMemo(() => {
    const padding = 24;
    const usableWidth = Math.max(1, width - padding * 2);
    const usableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(usableWidth / floorRect.width, usableHeight / floorRect.depth);
    const drawingWidth = floorRect.width * scale;
    const drawingHeight = floorRect.depth * scale;

    return {
      scale,
      offsetX: (width - drawingWidth) / 2,
      offsetY: (height - drawingHeight) / 2,
    };
  }, [floorRect.width, floorRect.depth, width, height]);

  const toPxX = (value: number) => viewport.offsetX + (value - floorRect.x) * viewport.scale;
  const toPxY = (value: number) => viewport.offsetY + (value - floorRect.y) * viewport.scale;

  const handleEnter = (event: ReactMouseEvent<SVGRectElement>, room: PlacedRoom) => {
    const svgBounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgBounds) {
      return;
    }
    setHoveredRoomId(room.id);
    onRoomHover?.(room.id);
    setTooltip({
      room,
      x: event.clientX - svgBounds.left,
      y: event.clientY - svgBounds.top,
    });
  };

  const handleMove = (event: ReactMouseEvent<SVGRectElement>, room: PlacedRoom) => {
    const svgBounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgBounds) {
      return;
    }
    setTooltip({
      room,
      x: event.clientX - svgBounds.left,
      y: event.clientY - svgBounds.top,
    });
  };

  const handleLeave = () => {
    setHoveredRoomId(null);
    setTooltip(null);
    onRoomHover?.(null);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-[#d7d1c4] bg-[#fbfaf7]">
      <svg
        id={svgId}
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Generated floor plan"
      >
        {showGrid ? (
          <SVGGrid
            x={floorRect.x}
            y={floorRect.y}
            width={floorRect.width}
            depth={floorRect.depth}
            scale={viewport.scale}
            offsetX={viewport.offsetX}
            offsetY={viewport.offsetY}
          />
        ) : null}

        <rect
          x={toPxX(floorRect.x)}
          y={toPxY(floorRect.y)}
          width={floorRect.width * viewport.scale}
          height={floorRect.depth * viewport.scale}
          fill="none"
          stroke="#2A241A"
          strokeWidth={4}
        />

        {roomsToRender.map((room) => (
          <SVGRoom
            key={room.id}
            room={room}
            scale={viewport.scale}
            offsetX={viewport.offsetX}
            offsetY={viewport.offsetY}
            originX={floorRect.x}
            originY={floorRect.y}
            showLabels={showLabels}
            isHighlighted={room.id === hoveredRoomId || room.id === highlightRoomId}
            onMouseEnter={handleEnter}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onClick={(roomId) => onRoomClick?.(roomId)}
          />
        ))}

        {plan.brief.stories === 2 ? (
          <text x={18} y={26} fill="#3A3326" style={{ fontSize: '13px', fontWeight: 700 }}>
            Floor {visibleFloor}
          </text>
        ) : null}
      </svg>

      {tooltip ? (
        <div
          className="pointer-events-none absolute rounded border border-[#d6b66b] bg-[#1f1b16] px-3 py-2 text-xs text-[#f3e9d2] shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <p className="font-semibold">{tooltip.room.label}</p>
          <p>{tooltip.room.sqft} sqft</p>
          <p>{ZONE_LABELS[tooltip.room.zone]} zone</p>
        </div>
      ) : null}
    </div>
  );
}
