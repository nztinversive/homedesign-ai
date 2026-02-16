'use client';

import type { PlacedRoom } from '@/lib/constraint-engine/types';

interface SVGDimensionsProps {
  rooms: PlacedRoom[];
  scale: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
}

function feetLabel(value: number): string {
  return `${Math.round(value)}'`;
}

export default function SVGDimensions({ rooms, scale, offsetX, offsetY, originX, originY }: SVGDimensionsProps) {
  return (
    <g aria-label="Room dimensions">
      {rooms.map((room) => {
        const x = offsetX + (room.x - originX) * scale;
        const y = offsetY + (room.y - originY) * scale;
        const width = room.width * scale;
        const depth = room.depth * scale;
        const showHorizontal = width >= 38;
        const showVertical = depth >= 38;

        return (
          <g key={`dim-${room.id}`} className="pointer-events-none">
            {showHorizontal ? (
              <>
                <line x1={x + 8} y1={y + 10} x2={x + width - 8} y2={y + 10} stroke="#E8D7B5" strokeWidth={1.1} />
                <line x1={x + 8} y1={y + 6} x2={x + 8} y2={y + 14} stroke="#E8D7B5" strokeWidth={1.1} />
                <line x1={x + width - 8} y1={y + 6} x2={x + width - 8} y2={y + 14} stroke="#E8D7B5" strokeWidth={1.1} />
                <text
                  x={x + width / 2}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#F3E9D2"
                  style={{ fontSize: '10px', fontWeight: 600 }}
                >
                  {feetLabel(room.width)}
                </text>
              </>
            ) : null}

            {showVertical ? (
              <>
                <line
                  x1={x + width - 10}
                  y1={y + 8}
                  x2={x + width - 10}
                  y2={y + depth - 8}
                  stroke="#E8D7B5"
                  strokeWidth={1.1}
                />
                <line x1={x + width - 14} y1={y + 8} x2={x + width - 6} y2={y + 8} stroke="#E8D7B5" strokeWidth={1.1} />
                <line
                  x1={x + width - 14}
                  y1={y + depth - 8}
                  x2={x + width - 6}
                  y2={y + depth - 8}
                  stroke="#E8D7B5"
                  strokeWidth={1.1}
                />
                <text
                  x={x + width - 3}
                  y={y + depth / 2}
                  textAnchor="middle"
                  fill="#F3E9D2"
                  transform={`rotate(90 ${x + width - 3} ${y + depth / 2})`}
                  style={{ fontSize: '10px', fontWeight: 600 }}
                >
                  {feetLabel(room.depth)}
                </text>
              </>
            ) : null}

            {width >= 60 && depth >= 46 ? (
              <text
                x={x + width / 2}
                y={y + depth - 8}
                textAnchor="middle"
                fill="#F8E8C3"
                style={{ fontSize: '10px', fontWeight: 700 }}
              >
                {feetLabel(room.width)} x {feetLabel(room.depth)}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
