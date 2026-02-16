'use client';

import { useEffect, useMemo, useState } from 'react';
import LotConstraintsPanel from './LotConstraintsPanel';
import RoomListBuilder from './RoomListBuilder';
import RoomPresets, { buildPresetRooms } from './RoomPresets';
import RoomSuggestions from './RoomSuggestions';
import type { DesignBrief, HomeStyle, LotConstraints, RoomRequirement } from '@/lib/constraint-engine/types';
import { getStyleDefaults } from '@/lib/style-defaults';

const HOME_STYLES: HomeStyle[] = ['modern', 'traditional', 'craftsman', 'farmhouse', 'contemporary', 'ranch'];
const DEFAULT_LOT: LotConstraints = {
  maxWidth: 80,
  maxDepth: 120,
  setbackFront: 25,
  setbackSide: 8,
  setbackRear: 15,
  entryFacing: 'south',
  garagePosition: 'none',
};

interface DesignBriefFormProps {
  initialBrief?: DesignBrief | null;
  isGenerating?: boolean;
  onGenerate: (brief: DesignBrief) => void;
}

function titleFromStyle(style: HomeStyle): string {
  return style.charAt(0).toUpperCase() + style.slice(1);
}

function normalizeRooms(rooms: RoomRequirement[]): RoomRequirement[] {
  return rooms
    .map((room) => ({
      ...room,
      label: room.label.trim() || 'Room',
      targetSqft: Math.max(20, Math.round(room.targetSqft ?? 0)),
    }))
    .filter((room) => room.label.length > 0);
}

function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function DesignBriefForm({ initialBrief, isGenerating = false, onGenerate }: DesignBriefFormProps) {
  const [targetSqft, setTargetSqft] = useState(initialBrief?.targetSqft ?? 1800);
  const [stories, setStories] = useState<1 | 2>(initialBrief?.stories ?? 1);
  const [style, setStyle] = useState<HomeStyle>(initialBrief?.style ?? 'ranch');
  const [rooms, setRooms] = useState<RoomRequirement[]>(initialBrief?.rooms ?? buildPresetRooms('3BR/2BA'));
  const [lot, setLot] = useState<LotConstraints>(() => ({ ...DEFAULT_LOT, ...(initialBrief?.lot ?? {}) }));
  const styleDefaults = useMemo(() => getStyleDefaults(style), [style]);

  useEffect(() => {
    if (!initialBrief) {
      return;
    }
    setTargetSqft(initialBrief.targetSqft);
    setStories(initialBrief.stories);
    setStyle(initialBrief.style);
    setRooms(initialBrief.rooms);
    setLot({ ...DEFAULT_LOT, ...(initialBrief.lot ?? {}) });
  }, [initialBrief]);

  const roomCount = useMemo(() => rooms.length, [rooms.length]);
  const styleBannerText = useMemo(
    () => `${titleFromStyle(style)} style adds: ${styleDefaults.envelopeHints.highlights.join(', ')}`,
    [style, styleDefaults],
  );

  const styleDefaultAdditions = useMemo(() => {
    const existingTypes = new Set(rooms.map((room) => room.type));
    return styleDefaults.defaultRooms.filter((room) => !existingTypes.has(room.type));
  }, [rooms, styleDefaults.defaultRooms]);

  const canApplyStyleDefaults = useMemo(() => {
    const needsStoryChange = Boolean(styleDefaults.forcedStories && styleDefaults.forcedStories !== stories);
    return styleDefaultAdditions.length > 0 || needsStoryChange;
  }, [stories, styleDefaultAdditions.length, styleDefaults.forcedStories]);

  const applyStyleDefaults = () => {
    if (styleDefaults.forcedStories) {
      setStories(styleDefaults.forcedStories);
    }

    if (styleDefaultAdditions.length === 0) {
      return;
    }

    setRooms((currentRooms) => {
      const existingTypes = new Set(currentRooms.map((room) => room.type));
      const additions = styleDefaults.defaultRooms
        .filter((room) => !existingTypes.has(room.type))
        .map((room) => ({ ...room }));
      return [...currentRooms, ...additions];
    });
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeRooms(rooms);
    onGenerate({
      targetSqft: Math.max(800, Math.min(5000, Math.round(targetSqft))),
      stories,
      style,
      rooms: normalized,
      lot,
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-6xl space-y-6 rounded-xl border border-dark-border bg-dark-card p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-cream">Home Design AI</h1>
        <p className="text-sm text-[#C8BDA8]">Describe your home brief and generate multiple floor plan variations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-cream">Target Square Footage: {Math.round(targetSqft)} sqft</span>
          <input
            type="range"
            min={800}
            max={5000}
            step={50}
            value={targetSqft}
            onChange={(event) => setTargetSqft(Number(event.target.value))}
            className="w-full accent-[#B8860B]"
          />
          <input
            type="number"
            min={800}
            max={5000}
            step={50}
            value={Math.round(targetSqft)}
            onChange={(event) => setTargetSqft(Number(event.target.value))}
            className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
          />
        </label>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-cream">Stories</p>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((storyCount) => (
                <button
                  key={storyCount}
                  type="button"
                  onClick={() => setStories(storyCount as 1 | 2)}
                  className={`rounded border px-3 py-2 text-sm transition ${
                    stories === storyCount
                      ? 'border-[#B8860B] bg-[#B8860B] text-[#15130f]'
                      : 'border-[#4A3F2D] bg-[#1A160F] text-cream hover:border-[#B8860B]'
                  }`}
                >
                  {storyCount}
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-cream">Style</span>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value as HomeStyle)}
              className="w-full rounded border border-[#4A3F2D] bg-[#15130f] px-3 py-2 text-sm text-cream"
            >
              {HOME_STYLES.map((homeStyle) => (
                <option key={homeStyle} value={homeStyle}>
                  {titleFromStyle(homeStyle)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-[#5A471F] bg-[#1A160F] p-4">
        <p className="text-sm text-[#E7CF95]">{styleBannerText}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={applyStyleDefaults}
            disabled={!canApplyStyleDefaults}
            className="rounded border border-[#B8860B] bg-[#B8860B] px-3 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CF9918] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply {titleFromStyle(style)} Defaults
          </button>
          {styleDefaults.forcedStories ? (
            <p className="text-xs text-[#CDBB97]">{titleFromStyle(style)} prefers a {styleDefaults.forcedStories}-story layout.</p>
          ) : null}
        </div>
        {styleDefaultAdditions.length > 0 ? (
          <p className="text-xs text-[#CDBB97]">
            Suggested additions: {styleDefaultAdditions.map((room) => room.label || formatTypeLabel(room.type)).join(', ')}
          </p>
        ) : null}
        {styleDefaults.removedRooms.length > 0 ? (
          <p className="text-xs text-[#B5A384]">
            Preferred replacements: {styleDefaults.removedRooms.map((type) => formatTypeLabel(type)).join(', ')}
          </p>
        ) : null}
      </section>

      <RoomPresets onSelectPreset={setRooms} />
      <RoomListBuilder rooms={rooms} onChange={setRooms} />
      <RoomSuggestions
        targetSqft={Math.round(targetSqft)}
        stories={stories}
        style={style}
        rooms={rooms}
        onAddRoom={(roomRequirement) => {
          setRooms((currentRooms) => {
            if (currentRooms.some((room) => room.type === roomRequirement.type)) {
              return currentRooms;
            }
            return [...currentRooms, roomRequirement];
          });
        }}
      />
      <LotConstraintsPanel lot={lot} onChange={setLot} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dark-border pt-4">
        <p className="text-sm text-[#C8BDA8]">{roomCount} rooms configured</p>
        <button
          type="submit"
          disabled={isGenerating}
          className="rounded-md border border-[#B8860B] bg-[#B8860B] px-5 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#D29A12] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? 'Generating...' : 'Generate Plans'}
        </button>
      </div>
    </form>
  );
}
