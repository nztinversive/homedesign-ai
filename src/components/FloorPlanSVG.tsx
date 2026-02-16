'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  Ref,
  WheelEvent as ReactWheelEvent,
} from 'react';
import SVGDimensions from './SVGDimensions';
import type { Direction, Door, PlacedPlan, PlacedRoom, WindowPlacement, Zone } from '@/lib/constraint-engine/types';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.12;
const TOUCH_TOLERANCE = 0.001;

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

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SVGGridProps {
  x: number;
  y: number;
  width: number;
  depth: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOUCH_TOLERANCE;
}

function clampViewBox(viewBox: ViewBoxRect, boundsWidth: number, boundsHeight: number): ViewBoxRect {
  const x =
    viewBox.width > boundsWidth
      ? (boundsWidth - viewBox.width) / 2
      : clamp(viewBox.x, 0, boundsWidth - viewBox.width);
  const y =
    viewBox.height > boundsHeight
      ? (boundsHeight - viewBox.height) / 2
      : clamp(viewBox.y, 0, boundsHeight - viewBox.height);

  return {
    ...viewBox,
    x,
    y,
  };
}

function positionAlongSpan(start: number, span: number, position: number): number {
  if (position >= 0 && position <= 1) {
    return start + span * position;
  }
  return start + clamp(position, 0, span);
}

function buildDoorSegment(door: Door, roomById: Map<string, PlacedRoom>): Omit<RenderSegment, 'id'> | null {
  const [roomAId, roomBId] = door.connectsRooms;
  const roomA = roomById.get(roomAId);
  const roomB = roomById.get(roomBId);

  if (!roomA || !roomB || roomA.floor !== roomB.floor) {
    return null;
  }

  const overlapYStart = Math.max(roomA.y, roomB.y);
  const overlapYEnd = Math.min(roomA.y + roomA.depth, roomB.y + roomB.depth);
  const overlapXStart = Math.max(roomA.x, roomB.x);
  const overlapXEnd = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);

  if (nearlyEqual(roomA.x + roomA.width, roomB.x) || nearlyEqual(roomB.x + roomB.width, roomA.x)) {
    const span = overlapYEnd - overlapYStart;
    if (span <= 0) {
      return null;
    }

    const x = nearlyEqual(roomA.x + roomA.width, roomB.x) ? roomB.x : roomA.x;
    const centerY = positionAlongSpan(overlapYStart, span, door.position);
    const halfDoor = Math.min(door.width / 2, span / 2);

    return {
      x1: x,
      y1: clamp(centerY - halfDoor, overlapYStart, overlapYEnd),
      x2: x,
      y2: clamp(centerY + halfDoor, overlapYStart, overlapYEnd),
    };
  }

  if (nearlyEqual(roomA.y + roomA.depth, roomB.y) || nearlyEqual(roomB.y + roomB.depth, roomA.y)) {
    const span = overlapXEnd - overlapXStart;
    if (span <= 0) {
      return null;
    }

    const y = nearlyEqual(roomA.y + roomA.depth, roomB.y) ? roomB.y : roomA.y;
    const centerX = positionAlongSpan(overlapXStart, span, door.position);
    const halfDoor = Math.min(door.width / 2, span / 2);

    return {
      x1: clamp(centerX - halfDoor, overlapXStart, overlapXEnd),
      y1: y,
      x2: clamp(centerX + halfDoor, overlapXStart, overlapXEnd),
      y2: y,
    };
  }

  return null;
}

function inferWallDirection(window: WindowPlacement): Direction | null {
  if (window.wallDirection) {
    return window.wallDirection;
  }
  if (window.wallId.includes('-north-')) {
    return 'north';
  }
  if (window.wallId.includes('-south-')) {
    return 'south';
  }
  if (window.wallId.includes('-east-')) {
    return 'east';
  }
  if (window.wallId.includes('-west-')) {
    return 'west';
  }
  return null;
}

function buildWindowSegment(window: WindowPlacement, roomById: Map<string, PlacedRoom>): Omit<RenderSegment, 'id'> | null {
  if (!window.roomId) {
    return null;
  }

  const room = roomById.get(window.roomId);
  const direction = inferWallDirection(window);

  if (!room || !direction) {
    return null;
  }

  if (direction === 'north' || direction === 'south') {
    const centerX = room.x + clamp(window.position, 0, room.width);
    const halfWidth = Math.min(window.width / 2, room.width / 2);
    const y = direction === 'north' ? room.y : room.y + room.depth;

    return {
      x1: clamp(centerX - halfWidth, room.x, room.x + room.width),
      y1: y,
      x2: clamp(centerX + halfWidth, room.x, room.x + room.width),
      y2: y,
    };
  }

  const centerY = room.y + clamp(window.position, 0, room.depth);
  const halfWidth = Math.min(window.width / 2, room.depth / 2);
  const x = direction === 'west' ? room.x : room.x + room.width;

  return {
    x1: x,
    y1: clamp(centerY - halfWidth, room.y, room.y + room.depth),
    x2: x,
    y2: clamp(centerY + halfWidth, room.y, room.y + room.depth),
  };
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
          stroke="#7B6F5E"
          strokeWidth={0.75}
          strokeOpacity={0.26}
        />
      ))}
      {horizontalLines.map((lineY) => (
        <line
          key={`grid-y-${lineY}`}
          x1={toPxX(x)}
          y1={toPxY(lineY)}
          x2={right}
          y2={toPxY(lineY)}
          stroke="#7B6F5E"
          strokeWidth={0.75}
          strokeOpacity={0.26}
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
  showDimensions?: boolean;
  showDoors?: boolean;
  showWindows?: boolean;
  enableZoomPan?: boolean;
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

interface PanState {
  startClientX: number;
  startClientY: number;
  startViewBoxX: number;
  startViewBoxY: number;
  moved: boolean;
}

export default function FloorPlanSVG({
  plan,
  width = 800,
  height = 600,
  showGrid = true,
  showLabels = true,
  showDimensions = false,
  showDoors = true,
  showWindows = true,
  enableZoomPan = true,
  highlightRoomId = null,
  onRoomClick,
  onRoomHover,
  svgId,
  svgRef,
}: FloorPlanSVGProps) {
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [viewBox, setViewBox] = useState<ViewBoxRect>({ x: 0, y: 0, width, height });
  const [isPanning, setIsPanning] = useState(false);

  const svgNodeRef = useRef<SVGSVGElement | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const suppressRoomClickRef = useRef(false);

  const defaultViewBox = useMemo<ViewBoxRect>(() => ({ x: 0, y: 0, width, height }), [width, height]);

  useEffect(() => {
    setViewBox(defaultViewBox);
  }, [defaultViewBox, plan]);

  const setSvgNode = useCallback(
    (node: SVGSVGElement | null) => {
      svgNodeRef.current = node;
      if (!svgRef) {
        return;
      }
      if (typeof svgRef === 'function') {
        svgRef(node);
        return;
      }
      (svgRef as MutableRefObject<SVGSVGElement | null>).current = node;
    },
    [svgRef],
  );

  const highlightedRoom = useMemo(
    () => plan.rooms.find((room) => room.id === highlightRoomId) ?? null,
    [plan.rooms, highlightRoomId],
  );
  const visibleFloor = highlightedRoom?.floor ?? 1;
  const floorRect = plan.envelope.floorRects[visibleFloor] ?? plan.envelope.footprint;
  const floorRooms = plan.rooms.filter((room) => room.floor === visibleFloor);
  const roomsToRender = floorRooms.length > 0 ? floorRooms : plan.rooms;

  const roomById = useMemo(() => new Map(roomsToRender.map((room) => [room.id, room] as const)), [roomsToRender]);

  const doorSegments = useMemo<RenderSegment[]>(() => {
    if (!showDoors) {
      return [];
    }
    const segments: RenderSegment[] = [];

    for (const door of plan.doors) {
      const segment = buildDoorSegment(door, roomById);
      if (!segment) {
        continue;
      }
      segments.push({
        id: door.id,
        ...segment,
      });
    }

    return segments;
  }, [plan.doors, roomById, showDoors]);

  const windowSegments = useMemo<RenderSegment[]>(() => {
    if (!showWindows) {
      return [];
    }

    const segments: RenderSegment[] = [];

    for (const windowPlacement of plan.windows) {
      if (windowPlacement.floor && windowPlacement.floor !== visibleFloor) {
        continue;
      }

      const segment = buildWindowSegment(windowPlacement, roomById);
      if (!segment) {
        continue;
      }
      segments.push({
        id: windowPlacement.id,
        ...segment,
      });
    }

    return segments;
  }, [plan.windows, roomById, showWindows, visibleFloor]);

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

  const resetView = () => {
    setViewBox(defaultViewBox);
  };

  const endPan = useCallback(() => {
    const panState = panStateRef.current;
    if (!panState) {
      return;
    }

    if (panState.moved) {
      suppressRoomClickRef.current = true;
      setTooltip(null);
    }

    panStateRef.current = null;
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (!isPanning) {
      return;
    }

    const handleWindowMouseUp = () => {
      endPan();
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [endPan, isPanning]);

  const handleMouseDown = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!enableZoomPan || event.button !== 0) {
      return;
    }

    setHoveredRoomId(null);
    setTooltip(null);
    onRoomHover?.(null);

    panStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBoxX: viewBox.x,
      startViewBoxY: viewBox.y,
      moved: false,
    };
    setIsPanning(true);
    event.preventDefault();
  };

  const handleMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const panState = panStateRef.current;
    if (!panState || !svgNodeRef.current) {
      return;
    }

    const rect = svgNodeRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const dx = event.clientX - panState.startClientX;
    const dy = event.clientY - panState.startClientY;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      panState.moved = true;
    }

    setViewBox((current) =>
      clampViewBox(
        {
          ...current,
          x: panState.startViewBoxX - (dx / rect.width) * current.width,
          y: panState.startViewBoxY - (dy / rect.height) * current.height,
        },
        width,
        height,
      ),
    );
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (!enableZoomPan || !svgNodeRef.current) {
      return;
    }

    event.preventDefault();

    const rect = svgNodeRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const relativeX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const relativeY = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    setViewBox((current) => {
      const currentZoom = width / current.width;
      const nextZoom = clamp(currentZoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(nextZoom - currentZoom) < 0.0001) {
        return current;
      }

      const nextWidth = width / nextZoom;
      const nextHeight = height / nextZoom;
      const focusX = current.x + relativeX * current.width;
      const focusY = current.y + relativeY * current.height;

      return clampViewBox(
        {
          x: focusX - relativeX * nextWidth,
          y: focusY - relativeY * nextHeight,
          width: nextWidth,
          height: nextHeight,
        },
        width,
        height,
      );
    });
  };

  const handleEnter = (event: ReactMouseEvent<SVGRectElement>, room: PlacedRoom) => {
    if (isPanning) {
      return;
    }

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
    if (isPanning) {
      return;
    }

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
    if (isPanning) {
      return;
    }
    setHoveredRoomId(null);
    setTooltip(null);
    onRoomHover?.(null);
  };

  const handleRoomClick = (roomId: string) => {
    if (suppressRoomClickRef.current) {
      suppressRoomClickRef.current = false;
      return;
    }

    onRoomClick?.(roomId);
  };

  const canResetZoom =
    Math.abs(viewBox.x - defaultViewBox.x) > 0.01 ||
    Math.abs(viewBox.y - defaultViewBox.y) > 0.01 ||
    Math.abs(viewBox.width - defaultViewBox.width) > 0.01 ||
    Math.abs(viewBox.height - defaultViewBox.height) > 0.01;

  const zoomLevel = width / viewBox.width;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-dark-border bg-[#15130f]">
      {enableZoomPan ? (
        <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-2">
          <span className="rounded border border-[#56472f] bg-[#1C170F]/95 px-2 py-1 text-xs font-semibold text-[#D9C79C]">
            {zoomLevel.toFixed(2)}x
          </span>
          <button
            type="button"
            onClick={resetView}
            disabled={!canResetZoom}
            className="pointer-events-auto rounded border border-[#B8860B] bg-[#1F1A12] px-2 py-1 text-xs font-semibold text-[#F2DDA9] transition hover:bg-[#2C2417] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Reset Zoom
          </button>
        </div>
      ) : null}

      <svg
        id={svgId}
        ref={setSvgNode}
        width={width}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-auto w-full select-none ${enableZoomPan ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        role="img"
        aria-label="Generated floor plan"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endPan}
        onMouseLeave={() => {
          endPan();
          handleLeave();
        }}
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
          stroke="#E5D8BF"
          strokeWidth={3}
          strokeOpacity={0.9}
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
            onClick={handleRoomClick}
          />
        ))}

        {showDimensions ? (
          <SVGDimensions
            rooms={roomsToRender}
            scale={viewport.scale}
            offsetX={viewport.offsetX}
            offsetY={viewport.offsetY}
            originX={floorRect.x}
            originY={floorRect.y}
          />
        ) : null}

        {showDoors ? (
          <g aria-label="Doors" className="pointer-events-none">
            {doorSegments.map((door) => (
              <line
                key={door.id}
                x1={toPxX(door.x1)}
                y1={toPxY(door.y1)}
                x2={toPxX(door.x2)}
                y2={toPxY(door.y2)}
                stroke="#F5E6C5"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          </g>
        ) : null}

        {showWindows ? (
          <g aria-label="Windows" className="pointer-events-none">
            {windowSegments.map((windowSegment) => (
              <line
                key={windowSegment.id}
                x1={toPxX(windowSegment.x1)}
                y1={toPxY(windowSegment.y1)}
                x2={toPxX(windowSegment.x2)}
                y2={toPxY(windowSegment.y2)}
                stroke="#A5D8FF"
                strokeWidth={3.5}
                strokeLinecap="round"
              />
            ))}
          </g>
        ) : null}

        {plan.brief.stories === 2 ? (
          <text x={18} y={26} fill="#EADCC1" style={{ fontSize: '13px', fontWeight: 700 }}>
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
