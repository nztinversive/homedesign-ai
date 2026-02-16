import { ROOM_DEFAULTS } from '@/lib/constraint-engine/constants';
import type { HomeStyle, RoomRequirement, RoomType } from '@/lib/constraint-engine/types';

export interface RoomSuggestion {
  type: RoomType;
  label: string;
  reason: string;
  targetSqft: number;
}

function titleFromType(type: RoomType): string {
  return type
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function hasRoomType(rooms: RoomRequirement[], type: RoomType): boolean {
  return rooms.some((room) => room.type === type);
}

function suggestedSqft(type: RoomType, targetSqft: number): number {
  const defaults = ROOM_DEFAULTS[type];

  if (targetSqft < 1200) {
    return Math.max(defaults.minSqft, Math.round(defaults.targetSqft * 0.75));
  }
  if (targetSqft >= 3000) {
    return Math.round(defaults.targetSqft * 1.15);
  }
  return defaults.targetSqft;
}

function compactReason(style: HomeStyle): string {
  if (style === 'modern' || style === 'contemporary') {
    return 'Compact open layouts work best with one connected social space.';
  }
  return 'Compact homes benefit from a combined kitchen/dining/living zone.';
}

export function suggestRooms(
  targetSqft: number,
  stories: 1 | 2,
  style: HomeStyle,
  currentRooms: RoomRequirement[],
): RoomSuggestion[] {
  const suggestions: RoomSuggestion[] = [];
  const seenTypes = new Set<RoomType>(currentRooms.map((room) => room.type));

  const addSuggestion = (type: RoomType, reason: string): void => {
    if (seenTypes.has(type)) {
      return;
    }
    seenTypes.add(type);
    suggestions.push({
      type,
      label: titleFromType(type),
      reason,
      targetSqft: suggestedSqft(type, targetSqft),
    });
  };

  if (targetSqft < 1200) {
    addSuggestion('great_room', compactReason(style));
  } else if (targetSqft < 2000) {
    addSuggestion('pantry', 'Mid-size plans often benefit from extra kitchen storage.');
    addSuggestion('laundry', 'A dedicated laundry room improves day-to-day utility.');
  } else if (targetSqft < 3000) {
    addSuggestion('office', 'This square-footage range can comfortably support a home office.');
    addSuggestion('mudroom', 'A mudroom helps manage transitions from garage or exterior entries.');
    addSuggestion('walk_in_closet', 'Additional storage usually fits well in this budget tier.');
    addSuggestion('bonus', 'A bonus room adds flexibility for guests, hobbies, or media use.');
  } else {
    addSuggestion('theater', 'Larger homes can accommodate dedicated entertainment spaces.');
    addSuggestion('gym', 'A home gym is commonly added at this size tier.');
    addSuggestion('outdoor_living', 'Large plans often extend living zones outdoors.');
  }

  if (stories === 2 && !hasRoomType(currentRooms, 'stairs')) {
    addSuggestion('stairs', 'Two-story layouts require a stair core for circulation.');
  }
  if (hasRoomType(currentRooms, 'primary_bed') && !hasRoomType(currentRooms, 'walk_in_closet')) {
    addSuggestion('walk_in_closet', 'Primary bedrooms are usually paired with a walk-in closet.');
  }
  if (hasRoomType(currentRooms, 'kitchen') && !hasRoomType(currentRooms, 'pantry')) {
    addSuggestion('pantry', 'Kitchen layouts are more functional with nearby pantry storage.');
  }
  if (hasRoomType(currentRooms, 'garage') && !hasRoomType(currentRooms, 'mudroom')) {
    addSuggestion('mudroom', 'Garage entry plans typically benefit from a mudroom buffer.');
  }

  return suggestions;
}
