'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PlacedPlan, PlanScore, WallAnalysis } from '@/lib/constraint-engine/types';

const STORAGE_KEY = 'homedesign_anonymous_user';

function useStoredUserId(): Id<'users'> | null {
  const [userId, setUserId] = useState<Id<'users'> | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.userId) setUserId(parsed.userId as Id<'users'>);
      }
    } catch { /* ignore */ }
  }, []);
  return userId;
}

interface DesignDoc {
  _id: Id<'designs'>;
  name: string;
  overallScore: number;
  isFavorite: boolean;
  planData: string;
  scoreData: string;
  wallData: string;
  variationIndex: number;
  updatedAt: number;
  projectId: Id<'projects'>;
}

function DesignCard({ design }: { design: DesignDoc }) {
  let roomCount = 0;
  let totalSqft = 0;
  try {
    const plan = JSON.parse(design.planData) as PlacedPlan;
    roomCount = plan.rooms?.length ?? 0;
    totalSqft = plan.rooms?.reduce((sum, r) => sum + (r.sqft ?? 0), 0) ?? 0;
  } catch { /* ignore */ }

  return (
    <div className="rounded-lg border border-[#645741] bg-[#1E1912] p-4 transition hover:border-[#B8860B]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-cream">{design.name}</h3>
          <p className="mt-1 text-sm text-[#C8BDA8]">
            {roomCount} rooms • {totalSqft} sqft
          </p>
        </div>
        <div className="flex items-center gap-2">
          {design.isFavorite && <span className="text-[#B8860B]">★</span>}
          <span className="rounded bg-[#2A241A] px-2 py-1 text-xs font-medium text-[#CCB685]">
            {Math.round(design.overallScore * 100)}%
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#8A7D6B]">
        Saved {new Date(design.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default function SavedDesignsPage() {
  const userId = useStoredUserId();
  const designs = useQuery(api.designs.listByUser, userId ? { userId } : 'skip');
  const projects = useQuery(api.projects.listByUser, userId ? { userId } : 'skip');

  const isLoading = userId !== null && (designs === undefined || projects === undefined);

  return (
    <main className="min-h-screen bg-[#15130f] px-4 py-8 text-cream md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-cream">Saved Designs</h1>
          <Link
            href="/"
            className="rounded border border-[#645741] bg-[#1E1912] px-3 py-2 text-sm text-cream transition hover:border-[#B8860B]"
          >
            ← New Design
          </Link>
        </div>

        {!userId ? (
          <div className="rounded-lg border border-[#645741] bg-[#1E1912] p-8 text-center">
            <p className="text-[#C8BDA8]">No saved designs yet. Generate your first floor plan!</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded bg-[#B8860B] px-4 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CCB685]"
            >
              Get Started
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B8860B] border-t-transparent" />
          </div>
        ) : designs && designs.length > 0 ? (
          <>
            {projects && projects.length > 0 && (
              <p className="text-sm text-[#8A7D6B]">
                {projects.length} project{projects.length !== 1 ? 's' : ''} • {designs.length} design{designs.length !== 1 ? 's' : ''}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((design) => (
                <DesignCard key={design._id} design={design as unknown as DesignDoc} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-[#645741] bg-[#1E1912] p-8 text-center">
            <p className="text-[#C8BDA8]">No saved designs yet. Generate some floor plans first!</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded bg-[#B8860B] px-4 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CCB685]"
            >
              Generate Plans
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
