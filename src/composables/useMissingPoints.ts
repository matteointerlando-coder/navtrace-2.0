import { computed, inject } from 'vue';
import { vesselDataKey } from './useVesselData';
import type { ShortPositionUpdate } from '../api/vesselService';

export interface PointGap {
  from: ShortPositionUpdate;
  to: ShortPositionUpdate;
  hours: number;
}

const DEFAULT_THRESHOLD_HOURS = 24;

//i punti devono essere già ordinati per timestamp.
function findGaps(points: ShortPositionUpdate[], thresholdHours: number): PointGap[] {
  const gaps: PointGap[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]!;
    const to = points[i + 1]!;
    const hours = (new Date(to.t).getTime() - new Date(from.t).getTime()) / 3_600_000;
    if (hours > thresholdHours) {
      gaps.push({ from, to, hours });
    }
  }
  return gaps;
}

export function useMissingPoints(thresholdHours = DEFAULT_THRESHOLD_HOURS) {
  const { vessels, activeVesselId, activeVessel } = inject(vesselDataKey)!;

  function getMissingPoints(vesselId: string): PointGap[] {
    const vessel = vessels.value.find((v) => v.id === vesselId);
    if (!vessel) return [];
    return findGaps(vessel.points, thresholdHours);
  }

  const activeVesselGaps = computed(() =>
    activeVesselId.value ? getMissingPoints(activeVesselId.value) : [],
  );

  return { activeVessel, activeVesselGaps, getMissingPoints };
}
