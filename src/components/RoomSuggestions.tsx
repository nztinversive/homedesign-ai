'use client';

import { useMemo } from 'react';
import { ROOM_DEFAULTS } from '@/lib/constraint-engine/constants';
import type { HomeStyle, RoomRequirement } from '@/lib/constraint-engine/types';
import { suggestRooms } from '@/lib/room-suggestions';

interface RoomSuggestionsProps {
  targetSqft: number;
  stories: 1 | 2;
  style: HomeStyle;
  rooms: RoomRequirement[];
  onAddRoom: (room: RoomRequirement) => void;
}

export default function RoomSuggestions({ targetSqft, stories, style, rooms, onAddRoom }: RoomSuggestionsProps) {
  const suggestions = useMemo(() => suggestRooms(targetSqft, stories, style, rooms), [targetSqft, stories, style, rooms]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cream">AI Room Suggestions</p>
        <p className="text-xs uppercase tracking-[0.14em] text-[#C5B082]">Smart Features</p>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <article
            key={suggestion.type}
            className="rounded-md border border-[#B8860B] bg-[#20190f] px-3 py-2"
            style={{
              animation: `suggestionAppear 280ms ease-out ${Math.min(index * 40, 180)}ms both`,
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#F1D9A1]">{suggestion.label}</p>
                <p className="text-xs text-[#D2C3A8]">{suggestion.reason}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onAddRoom({
                    type: suggestion.type,
                    label: suggestion.label,
                    targetSqft: suggestion.targetSqft,
                    mustHave: false,
                    needsExteriorWall: ROOM_DEFAULTS[suggestion.type].needsExteriorWall,
                    needsPlumbing: ROOM_DEFAULTS[suggestion.type].needsPlumbing,
                  })
                }
                className="rounded border border-[#B8860B] bg-[#B8860B] px-3 py-1 text-xs font-semibold text-[#15130f] transition hover:bg-[#D19C22]"
              >
                Add
              </button>
            </div>
          </article>
        ))}
      </div>

      <style jsx>{`
        @keyframes suggestionAppear {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
