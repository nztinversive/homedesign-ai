'use client';

import { Document, Page, View, Text, Svg, G, Rect as SvgRect, Line, StyleSheet, pdf } from '@react-pdf/renderer';
import type { GeneratedPlan, PlacedRoom, PlanScore, DesignBrief } from '../lib/constraint-engine/types';

// Zone colors matching the SVG renderer
const ZONE_COLORS: Record<string, string> = {
  social: '#3B82F6',
  private: '#8B5CF6',
  service: '#F59E0B',
  garage: '#6B7280',
  circulation: '#D1D5DB',
  exterior: '#10B981',
};

const ZONE_LABELS: Record<string, string> = {
  social: 'Social',
  private: 'Private',
  service: 'Service',
  garage: 'Garage',
  circulation: 'Circulation',
  exterior: 'Exterior',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#C9A84C',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  dateBadge: {
    backgroundColor: '#1B2A4A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 9,
    color: '#C9A84C',
    fontFamily: 'Helvetica-Bold',
  },

  // Brief summary
  briefSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  briefTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  briefRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  briefLabel: {
    fontSize: 9,
    color: '#6B7280',
    width: 100,
  },
  briefValue: {
    fontSize: 9,
    color: '#1E293B',
    fontFamily: 'Helvetica-Bold',
  },

  // Floor plan
  planSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    alignSelf: 'flex-start',
  },

  // Room schedule
  scheduleSection: {
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1B2A4A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 3,
  },
  tableHeaderText: {
    fontSize: 8,
    color: '#C9A84C',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  colRoom: { width: '30%' },
  colZone: { width: '15%' },
  colSize: { width: '20%' },
  colSqft: { width: '15%' },
  colFloor: { width: '10%' },
  colWalls: { width: '10%' },

  // Scores
  scoreSection: {
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreCard: {
    width: '23%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1B2A4A',
  },
  scoreLabel: {
    fontSize: 7,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 7,
    color: '#6B7280',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#9CA3AF',
  },
});

function scoreColor(val: number): string {
  if (val >= 80) return '#10B981';
  if (val >= 60) return '#F59E0B';
  return '#EF4444';
}

interface PlanPDFDocProps {
  plan: GeneratedPlan;
  brief: DesignBrief;
}

function FloorPlanSVG({ rooms, envelope }: { rooms: PlacedRoom[]; envelope: GeneratedPlan['envelope'] }) {
  const padding = 10;
  const maxW = 500;
  const maxH = 320;

  const bw = envelope.boundingWidth || 60;
  const bd = envelope.boundingDepth || 40;
  const scale = Math.min((maxW - padding * 2) / bw, (maxH - padding * 2) / bd);

  const sx = (x: number) => padding + x * scale;
  const sy = (y: number) => padding + y * scale;

  return (
    <Svg width={maxW} height={maxH}>
      {/* Envelope outline */}
      {envelope.segments.map((seg, i) => (
        <SvgRect
          key={`env-${i}`}
          x={sx(seg.x)}
          y={sy(seg.y)}
          width={seg.width * scale}
          height={seg.depth * scale}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth={1}
          strokeDasharray="4,2"
        />
      ))}

      {/* Rooms */}
      {rooms.map((room) => {
        const color = ZONE_COLORS[room.zone] || '#9CA3AF';
        const rw = room.width * scale;
        const rd = room.depth * scale;
        const rx = sx(room.x);
        const ry = sy(room.y);

        return (
          <G key={room.id}>
            <SvgRect
              x={rx}
              y={ry}
              width={rw}
              height={rd}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={1.5}
            />
            {/* Room label */}
            {rw > 30 && rd > 15 && (
              <Text
                x={rx + rw / 2}
                y={ry + rd / 2 - 3}
                style={{ fontSize: 6, fill: '#374151', textAnchor: 'middle' } as any}
              >
                {room.label}
              </Text>
            )}
            {/* Dimensions */}
            {rw > 40 && rd > 20 && (
              <Text
                x={rx + rw / 2}
                y={ry + rd / 2 + 5}
                style={{ fontSize: 5, fill: '#9CA3AF', textAnchor: 'middle' } as any}
              >
                {room.width}&apos; × {room.depth}&apos;
              </Text>
            )}
          </G>
        );
      })}

      {/* Grid lines */}
      {Array.from({ length: Math.ceil(bw / 10) + 1 }).map((_, i) => (
        <Line
          key={`gv-${i}`}
          x1={sx(i * 10)}
          y1={sy(0)}
          x2={sx(i * 10)}
          y2={sy(bd)}
          stroke="#F1F5F9"
          strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: Math.ceil(bd / 10) + 1 }).map((_, i) => (
        <Line
          key={`gh-${i}`}
          x1={sx(0)}
          y1={sy(i * 10)}
          x2={sx(bw)}
          y2={sy(i * 10)}
          stroke="#F1F5F9"
          strokeWidth={0.5}
        />
      ))}
    </Svg>
  );
}

const SCORE_LABELS: [keyof PlanScore, string][] = [
  ['overall', 'Overall'],
  ['adjacencySatisfaction', 'Adjacency'],
  ['zoneCohesion', 'Zone Cohesion'],
  ['naturalLight', 'Natural Light'],
  ['plumbingEfficiency', 'Plumbing'],
  ['circulationQuality', 'Circulation'],
  ['spaceUtilization', 'Space Usage'],
  ['privacyGradient', 'Privacy'],
];

function PlanPDFDoc({ plan, brief }: PlanPDFDocProps) {
  const rooms = plan.rooms;
  const score = plan.score;
  const totalSqft = rooms.reduce((s, r) => s + r.sqft, 0);
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Floor Plan Report</Text>
            <Text style={styles.subtitle}>
              {brief.targetSqft.toLocaleString()} sq ft • {brief.rooms.length} rooms • {brief.style} style
            </Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{now}</Text>
          </View>
        </View>

        {/* Brief summary */}
        <View style={styles.briefSection}>
          <Text style={styles.briefTitle}>Design Brief</Text>
          <View style={styles.briefRow}>
            <Text style={styles.briefLabel}>Target Area:</Text>
            <Text style={styles.briefValue}>{brief.targetSqft.toLocaleString()} sq ft</Text>
          </View>
          <View style={styles.briefRow}>
            <Text style={styles.briefLabel}>Stories:</Text>
            <Text style={styles.briefValue}>{brief.stories || 1}</Text>
          </View>
          <View style={styles.briefRow}>
            <Text style={styles.briefLabel}>Style:</Text>
            <Text style={styles.briefValue}>{brief.style.charAt(0).toUpperCase() + brief.style.slice(1)}</Text>
          </View>
          <View style={styles.briefRow}>
            <Text style={styles.briefLabel}>Actual Area:</Text>
            <Text style={styles.briefValue}>{totalSqft.toLocaleString()} sq ft ({Math.round(totalSqft / brief.targetSqft * 100)}% of target)</Text>
          </View>
          {brief.lot && (
            <>
              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Lot Size:</Text>
                <Text style={styles.briefValue}>{brief.lot.maxWidth}&apos; × {brief.lot.maxDepth}&apos;</Text>
              </View>
              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Entry Facing:</Text>
                <Text style={styles.briefValue}>{brief.lot.entryFacing.charAt(0).toUpperCase() + brief.lot.entryFacing.slice(1)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Floor plan */}
        <View style={styles.planSection}>
          <Text style={styles.planLabel}>Floor Plan</Text>
          <FloorPlanSVG rooms={rooms} envelope={plan.envelope} />
          <View style={styles.legendRow}>
            {Object.entries(ZONE_COLORS).filter(([z]) => rooms.some(r => r.zone === z)).map(([zone, color]) => (
              <View key={zone} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{ZONE_LABELS[zone] || zone}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Scores */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreTitle}>Quality Scores</Text>
          <View style={styles.scoreGrid}>
            {SCORE_LABELS.map(([key, label]) => (
              <View key={key} style={styles.scoreCard}>
                <Text style={[styles.scoreValue, { color: scoreColor(score[key]) }]}>
                  {Math.round(score[key])}
                </Text>
                <Text style={styles.scoreLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by Home Design AI</Text>
          <Text style={styles.footerText}>homedesign-ai.onrender.com</Text>
        </View>
      </Page>

      {/* Page 2: Room Schedule */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Room Schedule</Text>
            <Text style={styles.subtitle}>{rooms.length} rooms • {totalSqft.toLocaleString()} sq ft total</Text>
          </View>
        </View>

        <View style={styles.scheduleSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colRoom]}>Room</Text>
            <Text style={[styles.tableHeaderText, styles.colZone]}>Zone</Text>
            <Text style={[styles.tableHeaderText, styles.colSize]}>Dimensions</Text>
            <Text style={[styles.tableHeaderText, styles.colSqft]}>Area</Text>
            <Text style={[styles.tableHeaderText, styles.colFloor]}>Floor</Text>
            <Text style={[styles.tableHeaderText, styles.colWalls]}>Ext Walls</Text>
          </View>
          {rooms.map((room, i) => (
            <View key={room.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, styles.colRoom, { fontFamily: 'Helvetica-Bold' }]}>{room.label}</Text>
              <Text style={[styles.tableCell, styles.colZone]}>{ZONE_LABELS[room.zone] || room.zone}</Text>
              <Text style={[styles.tableCell, styles.colSize]}>{room.width}&apos; × {room.depth}&apos;</Text>
              <Text style={[styles.tableCell, styles.colSqft]}>{room.sqft} sq ft</Text>
              <Text style={[styles.tableCell, styles.colFloor]}>{room.floor}</Text>
              <Text style={[styles.tableCell, styles.colWalls]}>{room.exteriorWalls.length}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by Home Design AI</Text>
          <Text style={styles.footerText}>homedesign-ai.onrender.com</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generatePlanPDF(plan: GeneratedPlan, brief: DesignBrief): Promise<Blob> {
  const blob = await pdf(<PlanPDFDoc plan={plan} brief={brief} />).toBlob();
  return blob;
}

export function downloadPlanPDF(plan: GeneratedPlan, brief: DesignBrief) {
  generatePlanPDF(plan, brief)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `floor-plan-${brief.targetSqft}sqft-${brief.style}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    });
}
