'use client';

import { useMemo, useState } from 'react';
import DesignBriefForm from '@/components/DesignBriefForm';
import PhotoUpload from '@/components/PhotoUpload';
import PlanDetail from '@/components/PlanDetail';
import PlanGallery from '@/components/PlanGallery';
import {
  analyzeWalls,
  assignWindows,
  computeEnvelope,
  generateVariations,
  normalizeDesignBrief,
  scorePlan,
} from '@/lib/constraint-engine';
import type { DesignBrief, PlanScore, PlacedPlan, WallAnalysis } from '@/lib/constraint-engine/types';

type ViewMode = 'form' | 'results';
type InputMode = 'scratch' | 'upload';

export default function HomePage() {
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [plans, setPlans] = useState<PlacedPlan[]>([]);
  const [scores, setScores] = useState<PlanScore[]>([]);
  const [wallAnalyses, setWallAnalyses] = useState<WallAnalysis[]>([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [inputMode, setInputMode] = useState<InputMode>('scratch');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runGeneration = async (nextBrief: DesignBrief) => {
    setBrief(nextBrief);
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 160));

      const normalized = normalizeDesignBrief(nextBrief);
      const envelope = computeEnvelope(normalized);
      const variations = generateVariations(normalized, envelope);

      const results = variations.map((plan) => {
        const withWindows = assignWindows(plan);
        const walls = analyzeWalls(withWindows);
        const score = scorePlan(withWindows, walls);
        return { plan: withWindows, walls, score };
      });

      results.sort((a, b) => b.score.overall - a.score.overall);

      setPlans(results.map((result) => result.plan));
      setWallAnalyses(results.map((result) => result.walls));
      setScores(results.map((result) => result.score));
      setSelectedPlanIndex(0);
      setViewMode('results');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate plans.');
      setViewMode('form');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedPlan = useMemo(() => plans[selectedPlanIndex] ?? null, [plans, selectedPlanIndex]);
  const selectedScore = useMemo(() => scores[selectedPlanIndex] ?? null, [scores, selectedPlanIndex]);
  const selectedWalls = useMemo(() => wallAnalyses[selectedPlanIndex] ?? null, [wallAnalyses, selectedPlanIndex]);
  const hasResults = plans.length > 0 && scores.length > 0 && wallAnalyses.length > 0;

  return (
    <main className="min-h-screen bg-[#15130f] px-4 py-8 text-cream md:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {viewMode === 'form' || !hasResults ? (
          <section className="space-y-4">
            <div className="mx-auto flex w-full max-w-6xl rounded-lg border border-dark-border bg-dark-card p-1">
              <button
                type="button"
                onClick={() => setInputMode('scratch')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  inputMode === 'scratch'
                    ? 'bg-[#B8860B] text-[#15130f]'
                    : 'bg-transparent text-[#D7C6A7] hover:text-[#F0DEB8]'
                }`}
              >
                Design from Scratch
              </button>
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  inputMode === 'upload'
                    ? 'bg-[#B8860B] text-[#15130f]'
                    : 'bg-transparent text-[#D7C6A7] hover:text-[#F0DEB8]'
                }`}
              >
                Upload Floor Plan
              </button>
            </div>

            {inputMode === 'scratch' ? (
              <DesignBriefForm initialBrief={brief} isGenerating={isGenerating} onGenerate={runGeneration} />
            ) : (
              <PhotoUpload
                initialBrief={brief}
                onUseExtractedBrief={(extractedBrief) => {
                  setBrief(extractedBrief);
                  setInputMode('scratch');
                }}
              />
            )}
          </section>
        ) : null}

        {viewMode === 'results' && hasResults && selectedPlan && selectedScore && selectedWalls ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className="rounded border border-[#645741] bg-[#1E1912] px-3 py-2 text-sm text-cream transition hover:border-[#B8860B]"
              >
                Back to Form
              </button>
              <p className="text-sm text-[#C8BDA8]">
                {plans.length} variations generated • Selected #{selectedPlanIndex + 1}
              </p>
            </div>

            <PlanGallery
              plans={plans}
              scores={scores}
              selectedPlanIndex={selectedPlanIndex}
              onSelectPlan={setSelectedPlanIndex}
            />

            <PlanDetail
              plan={selectedPlan}
              walls={selectedWalls}
              score={selectedScore}
              brief={brief ?? undefined}
              onRegenerate={() => {
                if (brief) {
                  void runGeneration(brief);
                }
              }}
              onEditBrief={() => setViewMode('form')}
            />
          </section>
        ) : null}

        {errorMessage ? (
          <div className="rounded border border-[#8B3A2B] bg-[#2A1714] px-4 py-3 text-sm text-[#F5D0C5]">{errorMessage}</div>
        ) : null}
      </div>

      {isGenerating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15130f]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-dark-border bg-dark-card p-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#CCB685]">Generating Plans</p>
            <div className="h-2 overflow-hidden rounded-full bg-[#2A241A]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#B8860B]" />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
