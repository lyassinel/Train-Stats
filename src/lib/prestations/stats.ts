/**
 * Compute depot averages from cumulative totals.
 */
export const getDepotStats = (
  serviceCount: number,
  totalDrive: number,
  totalHLP: number,
  totalReserve: number,
  totalAmplitude: number,
) => {
  const safeCount = serviceCount > 0 ? serviceCount : 1
  return {
    avgDrive: totalDrive / safeCount,
    avgHLP: totalHLP / safeCount,
    avgReserve: totalReserve / safeCount,
    avgAmplitude: totalAmplitude / safeCount,
  }
}
