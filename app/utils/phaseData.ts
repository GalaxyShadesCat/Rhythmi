import { ActivitySegment } from "@/types/types";

/**
 * Returns the subset of dataPoints that fall within the segment's time window.
 */
export function getDataForSegment<T extends { timestamp: number }>(
  dataPoints: T[],
  segment: ActivitySegment
): T[] {
  return dataPoints.filter(
    (pt) => pt.timestamp >= segment.start && pt.timestamp <= segment.end
  );
}
