import { ROOM_DEFAULTS } from '@/lib/constraint-engine/constants';
import type { HomeStyle, RoomRequirement, RoomType } from '@/lib/constraint-engine/types';

export interface StyleEnvelopeHints {
  layout: string;
  porch?: string;
  circulation?: string;
  windows?: string;
  highlights: string[];
}

export interface StyleDefaults {
  forcedStories?: 1 | 2;
  defaultRooms: RoomRequirement[];
  removedRooms: RoomType[];
  envelopeHints: StyleEnvelopeHints;
}

function titleFromType(type: RoomType): string {
  return type
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function room(
  type: RoomType,
  options: {
    label?: string;
    targetSqft?: number;
    mustHave?: boolean;
    adjacentTo?: RoomType[];
  } = {},
): RoomRequirement {
  const defaults = ROOM_DEFAULTS[type];

  return {
    type,
    label: options.label ?? titleFromType(type),
    targetSqft: options.targetSqft ?? defaults.targetSqft,
    mustHave: options.mustHave ?? true,
    needsExteriorWall: defaults.needsExteriorWall,
    needsPlumbing: defaults.needsPlumbing,
    adjacentTo: options.adjacentTo,
  };
}

const STYLE_DEFAULTS: Record<HomeStyle, StyleDefaults> = {
  ranch: {
    forcedStories: 1,
    defaultRooms: [
      room('front_porch', { label: 'Front Porch' }),
      room('great_room', { label: 'Open Kitchen/Living' }),
    ],
    removedRooms: ['stairs'],
    envelopeHints: {
      layout: 'Single-story plan with open kitchen/living flow.',
      porch: 'Front porch emphasis.',
      circulation: 'Direct circulation with minimal vertical movement.',
      highlights: ['single story', 'front porch', 'open kitchen/living'],
    },
  },
  farmhouse: {
    defaultRooms: [
      room('front_porch', { label: 'Wrap Porch (Front)' }),
      room('back_porch', { label: 'Wrap Porch (Rear)' }),
      room('mudroom', { label: 'Mudroom' }),
      room('pantry', { label: 'Pantry' }),
      room('kitchen', { targetSqft: ROOM_DEFAULTS.kitchen.targetSqft + 80 }),
    ],
    removedRooms: [],
    envelopeHints: {
      layout: 'Social zones centered around a larger kitchen.',
      porch: 'Wrap-around porch profile.',
      circulation: 'Service entry support via mudroom.',
      highlights: ['wrap porch', 'mudroom', 'pantry'],
    },
  },
  modern: {
    defaultRooms: [room('great_room', { label: 'Great Room' })],
    removedRooms: ['living', 'dining'],
    envelopeHints: {
      layout: 'Great-room centric open plan in place of separate living/dining.',
      circulation: 'Minimal hallway footprint.',
      windows: 'Large openings and expansive glass.',
      highlights: ['great room', 'minimal hallways', 'large windows'],
    },
  },
  craftsman: {
    defaultRooms: [
      room('front_porch', { label: 'Covered Front Porch' }),
      room('office', { label: 'Office / Den' }),
      room('walk_in_closet', { label: 'Built-in Storage' }),
    ],
    removedRooms: [],
    envelopeHints: {
      layout: 'Defined rooms with practical work/study space.',
      porch: 'Covered front porch emphasis.',
      highlights: ['covered front porch', 'office/den', 'built-in storage'],
    },
  },
  traditional: {
    defaultRooms: [
      room('dining', { label: 'Formal Dining' }),
      room('living', { label: 'Living Room' }),
      room('family', { label: 'Family Room' }),
      room('foyer', { label: 'Foyer' }),
    ],
    removedRooms: ['great_room'],
    envelopeHints: {
      layout: 'Formal dining and living remain separate from family room.',
      circulation: 'Defined entry sequence through foyer.',
      highlights: ['formal dining', 'separate living/family', 'foyer'],
    },
  },
  contemporary: {
    defaultRooms: [
      room('great_room', { label: 'Open Plan Great Room' }),
      room('outdoor_living', { label: 'Outdoor Living' }),
      room('bonus', { label: 'Bonus Room' }),
    ],
    removedRooms: [],
    envelopeHints: {
      layout: 'Open plan with flexible social/private transitions.',
      windows: 'Broad daylight-oriented openings.',
      highlights: ['open plan', 'outdoor living', 'bonus room'],
    },
  },
};

function cloneRoomRequirement(roomRequirement: RoomRequirement): RoomRequirement {
  return {
    ...roomRequirement,
    adjacentTo: roomRequirement.adjacentTo ? [...roomRequirement.adjacentTo] : undefined,
    awayFrom: roomRequirement.awayFrom ? [...roomRequirement.awayFrom] : undefined,
  };
}

export function getStyleDefaults(style: HomeStyle): StyleDefaults {
  const defaults = STYLE_DEFAULTS[style];

  return {
    forcedStories: defaults.forcedStories,
    defaultRooms: defaults.defaultRooms.map(cloneRoomRequirement),
    removedRooms: [...defaults.removedRooms],
    envelopeHints: {
      ...defaults.envelopeHints,
      highlights: [...defaults.envelopeHints.highlights],
    },
  };
}
