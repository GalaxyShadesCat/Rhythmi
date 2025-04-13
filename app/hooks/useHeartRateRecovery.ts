import { useMemo } from "react";
import { HRPoint } from "@/hooks/useMongoDB";

function calculateAverageHR(data: HRPoint[]): number {
  if (!data || data.length === 0) return 0;
  const total = data.reduce((sum, point) => sum + point.value, 0);
  return total / data.length;
}

export function useAverageHeartRateComparison(
  baselineHR: HRPoint[],
  sessionHR: HRPoint[]
) {
  const { averageBaselineHR, averageSessionHR, difference } = useMemo(() => {
    const avgBaseline = calculateAverageHR(baselineHR);
    const avgSession = calculateAverageHR(sessionHR);
    const diff = avgSession - avgBaseline;

    return {
      averageBaselineHR: avgBaseline,
      averageSessionHR: avgSession,
      difference: diff, // for trend analysis
    };
  }, [baselineHR, sessionHR]);

  return {
    averageBaselineHR,
    averageSessionHR,
    difference,
  };
}
