/**
 * Seeded random number generator using LCG algorithm
 */
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  /**
   * Get next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  /**
   * Get random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /**
   * Reset seed
   */
  reset(seed: number): void {
    this.seed = seed
  }
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[], random: SeededRandom): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = random.nextInt(0, i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Get a random element from an array
 */
export function randomElement<T>(array: T[], random: SeededRandom): T {
  const index = random.nextInt(0, array.length)
  return array[index]
}

/**
 * Get multiple random elements from an array without replacement
 */
export function randomElements<T>(array: T[], count: number, random: SeededRandom): T[] {
  const shuffled = shuffle(array, random)
  return shuffled.slice(0, Math.min(count, array.length))
}
