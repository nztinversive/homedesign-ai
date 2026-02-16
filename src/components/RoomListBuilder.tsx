'use client';

import { ROOM_DEFAULTS } from '@/lib/constraint-engine/constants';
import type { RoomRequirement, RoomType } from '@/lib/constraint-engine/types';

const ROOM_TYPES: RoomType[] = [
  'primary_bed',
  'bedroom',
  'primary_bath',
  'bathroom',
  'half_bath',
  'kitchen',
  'dining',
  'living',
  'family',
  'great_room',
  'office',
  'laundry',
  'mudroom',
  'pantry',
  'walk_in_closet',
  'garage',
  'front_porch',
  'back_porch',
  'outdoor_living',
  'foyer',
  'hallway',
  'stairs',
  'bonus',
  'theater',
  'gym',
];

function titleFromType(type: RoomType): string {
  return type
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

interface RoomListBuilderProps {
  rooms: RoomRequirement[];
  onChange: (rooms: RoomRequirement[]) => void;
}

export default function RoomListBuilder({ rooms, onChange }: RoomListBuilderProps) {
  const updateRoom = (index: number, room: RoomRequirement) => {
    const nextRooms = [...rooms];
    nextRooms[index] = room;
    onChange(nextRooms);
  };

  const addRoom = () => {
    const type: RoomType = 'bedroom';
    onChange([
      ...rooms,
      {
        type,
        label: titleFromType(type),
        targetSqft: ROOM_DEFAULTS[type].targetSqft,
        mustHave: true,
      },
    ]);
  };

  const removeRoom = (index: number) => {
    onChange(rooms.filter((_, roomIndex) => roomIndex !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cream">Room List</p>
        <button
          type="button"
          onClick={addRoom}
          className="rounded-md border border-[#B8860B] px-3 py-1 text-sm text-[#E8C77B] transition hover:bg-[#B8860B] hover:text-[#1A160F]"
        >
          Add Room
        </button>
      </div>

      <div className="space-y-3">
        {rooms.map((room, index) => (
          <div key={`${room.type}-${index}`} className="rounded-md border border-dark-border bg-[#201b14] p-3">
            <div className="grid gap-3 md:grid-cols-12">
              <label className="space-y-1 md:col-span-4">
                <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Type</span>
                <select
                  className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-2 py-2 text-sm text-cream"
                  value={room.type}
                  onChange={(event) => {
                    const nextType = event.target.value as RoomType;
                    const defaults = ROOM_DEFAULTS[nextType];
                    updateRoom(index, {
                      ...room,
                      type: nextType,
                      label: room.label.trim() ? room.label : titleFromType(nextType),
                      targetSqft: defaults.targetSqft,
                      needsExteriorWall: defaults.needsExteriorWall,
                      needsPlumbing: defaults.needsPlumbing,
                    });
                  }}
                >
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType} value={roomType}>
                      {titleFromType(roomType)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 md:col-span-4">
                <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Label</span>
                <input
                  type="text"
                  className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-2 py-2 text-sm text-cream"
                  value={room.label}
                  onChange={(event) => updateRoom(index, { ...room, label: event.target.value })}
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs uppercase tracking-wide text-[#BDAF95]">Target Sqft</span>
                <input
                  type="number"
                  min={20}
                  className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-2 py-2 text-sm text-cream"
                  value={room.targetSqft ?? ROOM_DEFAULTS[room.type].targetSqft}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    updateRoom(index, { ...room, targetSqft: Number.isFinite(value) ? value : room.targetSqft });
                  }}
                />
              </label>

              <div className="flex items-end justify-between gap-2 md:col-span-2">
                <label className="flex items-center gap-2 rounded border border-[#4A3F2D] px-2 py-2 text-sm text-cream">
                  <input
                    type="checkbox"
                    checked={room.mustHave}
                    onChange={(event) => updateRoom(index, { ...room, mustHave: event.target.checked })}
                  />
                  Must-Have
                </label>
                <button
                  type="button"
                  onClick={() => removeRoom(index)}
                  className="rounded border border-[#7B5D35] px-2 py-2 text-sm text-[#E6C070] transition hover:bg-[#7B5D35] hover:text-[#15130f]"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
