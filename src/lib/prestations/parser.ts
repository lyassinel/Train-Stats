import { totalCTBRegex } from './regex'

const PRESTATION_SEPARATOR =
  '____________________________________________________________________________________________________'

/**
 * Split a full livret text into raw prestations by separator line.
 */
export const splitPrestations = (data: string): string[] => {
  return data
    .split(PRESTATION_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

/**
 * Split a prestation tasks block into individual tasks.
 */
export const splitTasks = (tasks: string): string[] => {
  const separator = /\d{2}.\d{2}-\d{2}.\d{2} *\d{0,4}/
  const regex = new RegExp(`(${separator.source})`, 'g')
  const parts = tasks.split(regex).filter((entry) => entry.trim() !== '')

  const result: string[] = []
  for (let i = 0; i < parts.length; i++) {
    if (separator.test(parts[i]) && i > 0) {
      result[result.length - 1] += parts[i]
    } else if (!separator.test(parts[i])) {
      result.push(parts[i])
    }
    separator.lastIndex = 0
  }
  return result
}

/**
 * Compute duration in minutes between HH:MM start and end (supports overnight).
 */
export const durationMinutes = (
  startHour: string,
  startMin: string,
  endHour: string,
  endMin: string,
): number => {
  const start = Number(startHour) * 60 + Number(startMin)
  const end = Number(endHour) * 60 + Number(endMin)
  return end >= start ? end - start : end + 24 * 60 - start
}

/**
 * Count total CTB occurrences in the full livret text.
 */
export const countCTB = (livret: string): number => {
  const total = livret.match(totalCTBRegex)
  return total ? total.length : 0
}
