'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ROOM_DEFAULTS } from '@/lib/constraint-engine/constants';
import type { DesignBrief, LotConstraints, RoomRequirement } from '@/lib/constraint-engine/types';

interface PhotoUploadProps {
  initialBrief?: DesignBrief | null;
  onUseExtractedBrief: (brief: DesignBrief) => void;
}

const DEFAULT_LOT: LotConstraints = {
  maxWidth: 80,
  maxDepth: 120,
  setbackFront: 25,
  setbackSide: 8,
  setbackRear: 15,
  entryFacing: 'south',
  garagePosition: 'none',
};

function buildMockRoom(type: RoomRequirement['type'], label: string, targetSqft: number): RoomRequirement {
  const defaults = ROOM_DEFAULTS[type];
  return {
    type,
    label,
    targetSqft,
    mustHave: true,
    needsExteriorWall: defaults.needsExteriorWall,
    needsPlumbing: defaults.needsPlumbing,
  };
}

const MOCK_EXTRACTED_ROOMS: RoomRequirement[] = [
  buildMockRoom('primary_bed', 'Primary Bedroom', 240),
  buildMockRoom('primary_bath', 'Primary Bath', 95),
  buildMockRoom('bedroom', 'Bedroom 2', 135),
  buildMockRoom('bedroom', 'Bedroom 3', 130),
  buildMockRoom('bathroom', 'Hall Bath', 55),
  buildMockRoom('kitchen', 'Kitchen', 185),
  buildMockRoom('living', 'Living Room', 255),
  buildMockRoom('dining', 'Dining Room', 150),
  buildMockRoom('laundry', 'Laundry', 45),
];

export default function PhotoUpload({ initialBrief, onUseExtractedBrief }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedRooms, setExtractedRooms] = useState<RoomRequirement[] | null>(null);
  const [extractedBrief, setExtractedBrief] = useState<DesignBrief | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadTitle = useMemo(() => {
    if (file) {
      return file.name;
    }
    return 'Upload floor plan image';
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const onFileSelected = (nextFile: File | null) => {
    if (!nextFile || !nextFile.type.startsWith('image/')) {
      return;
    }
    setFile(nextFile);
    setExtractedRooms(null);
    setExtractedBrief(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFileSelected(event.dataTransfer.files?.[0] ?? null);
  };

  const handleAnalyze = () => {
    if (!file || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    window.setTimeout(() => {
      const demoRooms = MOCK_EXTRACTED_ROOMS.map((roomRequirement) => ({ ...roomRequirement }));
      const extractedBrief: DesignBrief = {
        targetSqft: 1850,
        stories: initialBrief?.stories ?? 1,
        style: initialBrief?.style ?? 'ranch',
        rooms: demoRooms,
        lot: { ...DEFAULT_LOT, ...(initialBrief?.lot ?? {}) },
      };

      setExtractedRooms(demoRooms);
      setExtractedBrief(extractedBrief);
      setIsAnalyzing(false);
    }, 650);
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 rounded-xl border border-dark-border bg-dark-card p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-cream">Upload Floor Plan</h1>
        <p className="text-sm text-[#C8BDA8]">Drop a floor plan image or sketch to scaffold a brief with mock room extraction.</p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`w-full rounded-lg border border-dashed px-4 py-6 text-left transition ${
          isDragging ? 'border-[#B8860B] bg-[#21190F]' : 'border-[#5A4A2C] bg-[#19150F] hover:border-[#B8860B]'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        title={uploadTitle}
      >
        {previewUrl ? (
          <div className="space-y-3">
            <Image
              src={previewUrl}
              alt="Uploaded floor plan preview"
              width={1400}
              height={900}
              unoptimized
              className="max-h-[420px] w-full rounded-md border border-[#4A3F2D] object-contain"
            />
            <p className="text-xs text-[#C8BDA8]">Click to replace image</p>
          </div>
        ) : (
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold text-cream">Drag and drop image here, or click to upload</p>
            <p className="text-xs text-[#BFAF95]">PNG, JPG, or sketch screenshots</p>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!file || isAnalyzing}
          title="Coming Soon - Moondream Integration"
          className="rounded-md border border-[#B8860B] bg-[#B8860B] px-4 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CF991A] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? 'Analyzing Demo...' : 'Analyze'}
        </button>
        <p className="text-xs text-[#C8BDA8]" title="Coming Soon - Moondream Integration">
          Coming Soon - Moondream Integration (currently running demo extraction)
        </p>
      </div>

      {extractedRooms ? (
        <div className="space-y-2 rounded-lg border border-[#5A4A2C] bg-[#19150F] p-4">
          <p className="text-sm font-semibold text-[#EACD88]">Demo extraction complete: detected 3BR / 2BA layout</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {extractedRooms.map((room, index) => (
              <div key={`${room.type}-${index}`} className="rounded border border-[#3F3320] bg-[#15130f] px-3 py-2 text-sm text-[#D6C4A2]">
                {room.label} - {room.targetSqft} sqft
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (extractedBrief) {
                onUseExtractedBrief(extractedBrief);
              }
            }}
            className="rounded border border-[#B8860B] bg-[#B8860B] px-3 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CF991A]"
          >
            Use Extracted Rooms
          </button>
          <p className="text-xs text-[#B6A385]">Demo mode only. Apply these extracted rooms to the form to continue into generation.</p>
        </div>
      ) : null}
    </section>
  );
}
