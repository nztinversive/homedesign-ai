'use client';

import { useCallback, useState } from 'react';
import type { PlacedPlan } from '@/lib/constraint-engine/types';
import type { ComplianceReport, RuleCategory, RuleResult, Violation } from '@/lib/compliance-engine/types';
import { runComplianceCheck } from '@/lib/compliance-engine';

interface CompliancePanelProps {
  plan: PlacedPlan;
}

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  'room-minimums': 'Room Minimums',
  egress: 'Egress',
  bathrooms: 'Bathrooms',
  kitchens: 'Kitchens',
  hallways: 'Hallways',
  accessibility: 'Accessibility',
  structural: 'Structural',
  energy: 'Energy',
};

const CATEGORY_ICONS: Record<RuleCategory, string> = {
  'room-minimums': '📐',
  egress: '🚪',
  bathrooms: '🚿',
  kitchens: '🍳',
  hallways: '🚶',
  accessibility: '♿',
  structural: '🏗️',
  energy: '⚡',
};

const SEVERITY_COLORS: Record<string, string> = {
  error: '#C0392B',
  warning: '#B8860B',
  info: '#4A90D9',
};

const SEVERITY_LABELS: Record<string, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

function groupResultsByCategory(results: RuleResult[]): Record<string, RuleResult[]> {
  const grouped: Record<string, RuleResult[]> = {};
  for (const r of results) {
    const cat = r.ruleId.split('-')[0] || 'other';
    // Map rule ID prefixes to categories
    let category = 'other';
    if (r.ruleId.startsWith('room-min')) category = 'room-minimums';
    else if (r.ruleId.startsWith('egress')) category = 'egress';
    else if (r.ruleId.startsWith('bath')) category = 'bathrooms';
    else if (r.ruleId.startsWith('kitchen')) category = 'kitchens';
    else if (r.ruleId.startsWith('hallway')) category = 'hallways';
    else if (r.ruleId.startsWith('ADA') || r.ruleId.startsWith('ada')) category = 'accessibility';
    else if (r.ruleId.startsWith('struct')) category = 'structural';
    else if (r.ruleId.startsWith('energy')) category = 'energy';

    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(r);
  }
  return grouped;
}

export default function CompliancePanel({ plan }: CompliancePanelProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setIsRunning(true);
    setReport(null);
    try {
      const result = await runComplianceCheck(plan, 'irc-base');
      setReport(result);
    } catch (e) {
      console.error('Compliance check failed:', e);
    } finally {
      setIsRunning(false);
    }
  }, [plan]);

  if (!report) {
    return (
      <section className="space-y-3 rounded-lg border border-dark-border bg-dark-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#CAB89B]">
          Code Compliance
        </h3>
        <p className="text-xs text-[#9A8C74]">
          Run IRC/ADA/IECC compliance checks against this plan.
        </p>
        <button
          type="button"
          onClick={runCheck}
          disabled={isRunning}
          className="w-full rounded border border-[#B8860B] bg-[#B8860B] px-3 py-2 text-sm font-semibold text-[#15130f] transition hover:bg-[#CC9714] disabled:opacity-50"
        >
          {isRunning ? 'Checking…' : '🔍 Check Compliance'}
        </button>
      </section>
    );
  }

  const grouped = groupResultsByCategory(report.results);
  const { summary } = report;

  return (
    <section className="space-y-3 rounded-lg border border-dark-border bg-dark-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#CAB89B]">
          Code Compliance
        </h3>
        <button
          type="button"
          onClick={runCheck}
          disabled={isRunning}
          className="rounded border border-[#6A5B42] bg-[#201A13] px-2 py-1 text-xs text-cream transition hover:border-[#B8860B] disabled:opacity-50"
        >
          {isRunning ? '…' : '↻ Recheck'}
        </button>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold"
          style={{
            backgroundColor: summary.compliancePercentage >= 80 ? '#1A2A14' : summary.compliancePercentage >= 50 ? '#2A2216' : '#2A1714',
            color: summary.compliancePercentage >= 80 ? '#4CAF50' : summary.compliancePercentage >= 50 ? '#B8860B' : '#C0392B',
            border: `1px solid ${summary.compliancePercentage >= 80 ? '#4A6B3A' : summary.compliancePercentage >= 50 ? '#6A5B42' : '#8B3A2B'}`,
          }}
        >
          {summary.compliancePercentage}%
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-cream">
            {summary.passed}/{summary.totalRules} rules passed
          </p>
          <div className="mt-1 flex gap-3 text-xs">
            {summary.criticalViolations > 0 && (
              <span style={{ color: SEVERITY_COLORS.error }}>
                {summary.criticalViolations} error{summary.criticalViolations !== 1 ? 's' : ''}
              </span>
            )}
            {summary.warnings > 0 && (
              <span style={{ color: SEVERITY_COLORS.warning }}>
                {summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}
              </span>
            )}
            {summary.info > 0 && (
              <span style={{ color: SEVERITY_COLORS.info }}>
                {summary.info} info
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 overflow-hidden rounded-full bg-[#2A241A]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${summary.compliancePercentage}%`,
            backgroundColor: summary.compliancePercentage >= 80 ? '#4CAF50' : summary.compliancePercentage >= 50 ? '#B8860B' : '#C0392B',
          }}
        />
      </div>

      {/* Category Breakdown */}
      <div className="max-h-[400px] space-y-1 overflow-y-auto pr-1">
        {(Object.keys(CATEGORY_LABELS) as RuleCategory[]).map((cat) => {
          const results = grouped[cat] || [];
          if (results.length === 0) return null;

          const passed = results.filter((r) => r.passed).length;
          const total = results.length;
          const allPassed = passed === total;
          const isExpanded = expandedCategory === cat;
          const violations = results.flatMap((r) => r.violations);

          return (
            <div key={cat} className="rounded border border-[#3D3426]">
              <button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-[#1E1912]"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="font-medium text-cream">{CATEGORY_LABELS[cat]}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: allPassed ? '#1A2A14' : '#2A1714',
                      color: allPassed ? '#4CAF50' : '#C0392B',
                      border: `1px solid ${allPassed ? '#4A6B3A' : '#8B3A2B'}`,
                    }}
                  >
                    {passed}/{total}
                  </span>
                  <span className="text-xs text-[#9A8C74]">{isExpanded ? '▾' : '▸'}</span>
                </span>
              </button>

              {isExpanded && violations.length > 0 && (
                <div className="border-t border-[#3D3426] px-3 py-2 space-y-2">
                  {violations.map((v: Violation) => {
                    const isVExpanded = expandedViolation === v.id;
                    return (
                      <div key={v.id} className="rounded border border-[#2A241A] bg-[#1A160F]">
                        <button
                          type="button"
                          onClick={() => setExpandedViolation(isVExpanded ? null : v.id)}
                          className="flex w-full items-start gap-2 px-2 py-1.5 text-left"
                        >
                          <span
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: `${SEVERITY_COLORS[v.severity]}22`,
                              color: SEVERITY_COLORS[v.severity],
                            }}
                          >
                            {v.severity === 'error' ? '✕' : v.severity === 'warning' ? '!' : 'i'}
                          </span>
                          <span className="flex-1 text-xs text-[#D0BD9A]">{v.description}</span>
                        </button>

                        {isVExpanded && (
                          <div className="border-t border-[#2A241A] px-2 py-2 space-y-1.5">
                            {v.codeSection && (
                              <p className="text-[10px] text-[#9A8C74]">
                                Code: <span className="text-[#CDBB97]">{v.codeSection}</span>
                              </p>
                            )}
                            {v.currentValue != null && v.requiredValue != null && (
                              <p className="text-[10px] text-[#9A8C74]">
                                Current: <span className="text-[#C0392B]">{String(v.currentValue)}</span>
                                {' → '}Required: <span className="text-[#4CAF50]">{String(v.requiredValue)}</span>
                              </p>
                            )}
                            {v.remediation && v.remediation.length > 0 && (
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-semibold text-[#CDBB97]">Fix:</p>
                                {v.remediation.map((rem, i) => (
                                  <p key={i} className="pl-2 text-[10px] text-[#B0A080]">
                                    • {rem}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && violations.length === 0 && (
                <div className="border-t border-[#3D3426] px-3 py-2">
                  <p className="text-xs text-[#4CAF50]">✓ All rules passed</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Execution Time */}
      <p className="text-[10px] text-[#7A6C54]">
        Checked {summary.totalRules} rules in {summary.totalExecutionTime}ms • IRC/ADA/IECC
      </p>
    </section>
  );
}
