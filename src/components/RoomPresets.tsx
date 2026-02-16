'use client';

import { ROOM_DEFAULTS } from '@/lib/constraint-engine/constants';
import type { RoomRequirement, RoomType } from '@/lib/constraint-engine/types';

interface PresetRoomConfig {
  type: RoomType;
  label: string;
}

const PRESETS: Record<'2BR/1BA' | '3BR/2BA' | '4BR/3BA', PresetRoomConfig[]> = {
  '2BR/1BA': [
    { type: 'primary_bed', label: 'Primary Bedroom' },
    { type: 'bedroom', label: 'Bedroom 2' },
    { type: 'primary_bath', label: 'Bathroom' },
    { type: 'kitchen', label: 'Kitchen' },
    { type: 'living', label: 'Living Room' },
    { type: 'dining', label: 'Dining Room' },
  ],
  '3BR/2BA': [
    { type: 'primary_bed', label: 'Primary Bedroom' },
    { type: 'primary_bath', label: 'Primary Bath' },
    { type: 'bedroom', label: 'Bedroom 2' },
    { type: 'bedroom', label: 'Bedroom 3' },
    { type: 'bathroom', label: 'Hall Bath' },
    { type: 'kitchen', label: 'Kitchen' },
    { type: 'living', label: 'Living Room' },
    { type: 'dining', label: 'Dining Room' },
  ],
  '4BR/3BA': [
    { type: 'primary_bed', label: 'Primary Suite' },
    { type: 'primary_bath', label: 'Primary Bath' },
    { type: 'bedroom', label: 'Bedroom 2' },
    { type: 'bedroom', label: 'Bedroom 3' },
    { type: 'bedroom', label: 'Bedroom 4' },
    { type: 'bathroom', label: 'Hall Bath' },
    { type: 'bathroom', label: 'Jack & Jill Bath' },
    { type: 'kitchen', label: 'Kitchen' },
    { type: 'great_room', label: 'Great Room' },
    { type: 'dining', label: 'Dining Room' },
    { type: 'office', label: 'Home Office' },
    { type: 'laundry', label: 'Laundry' },
  ],
};

function toRequirement(room: PresetRoomConfig): RoomRequirement {
  return {
    type: room.type,
    label: room.label,
    targetSqft: ROOM_DEFAULTS[room.type].targetSqft,
    mustHave: true,
  };
}

interface RoomPresetsProps {
  onSelectPreset: (rooms: RoomRequirement[]) => void;
}

export function buildPresetRooms(presetName: keyof typeof PRESETS): RoomRequirement[] {
  return PRESETS[presetName].map(toRequirement);
}

export default function RoomPresets({ onSelectPreset }: RoomPresetsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-cream">Room Presets</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((presetName) => (
          <button
            key={presetName}
            type="button"
            className="rounded-md border border-[#5A4A2C] bg-[#221d14] px-3 py-1.5 text-sm text-[#E9D3A0] transition hover:border-[#B8860B] hover:text-[#F3E9D2]"
            onClick={() => onSelectPreset(buildPresetRooms(presetName))}
          >
            {presetName}
          </button>
        ))}
      </div>
    </div>
  );
}
