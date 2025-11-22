import type { IconData } from '../../stores/types'
import { getAllIcons } from '../../lib/icons'
import { SeededRandom, shuffle } from '../utils/random'

/**
 * Icon Pool System
 * Manages the pool of available icons and unlocking new icons
 */
export class IconPoolSystem {
  private allIcons: IconData[] = []
  private iconPool: IconData[] = []
  private unlockedIcons: IconData[] = []
  private random: SeededRandom

  constructor(seed: number = Date.now()) {
    this.random = new SeededRandom(seed)
    this.initialize()
  }

  /**
   * Initialize the icon pool with all available icons
   */
  initialize(): void {
    this.allIcons = getAllIcons()
    // Shuffle the icon pool to randomize unlock order
    this.iconPool = shuffle([...this.allIcons], this.random)
  }

  /**
   * Unlock the next icon for a specific tier
   */
  unlockNext(tier: number): IconData | null {
    if (this.iconPool.length === 0) {
      return null
    }

    const icon = this.iconPool.shift()!
    icon.tier = tier
    icon.unlocked = true
    this.unlockedIcons.push(icon)

    return icon
  }

  /**
   * Get all unlocked icons
   */
  getUnlockedIcons(): IconData[] {
    return [...this.unlockedIcons]
  }

  /**
   * Get unlocked icons for a specific tier
   */
  getIconsForTier(tier: number): IconData[] {
    return this.unlockedIcons.filter((icon) => icon.tier === tier)
  }

  /**
   * Check if an icon is unlocked
   */
  isIconUnlocked(iconName: string): boolean {
    return this.unlockedIcons.some((icon) => icon.name === iconName)
  }

  /**
   * Get total number of icons available
   */
  getTotalIconCount(): number {
    return this.allIcons.length
  }

  /**
   * Get number of unlocked icons
   */
  getUnlockedIconCount(): number {
    return this.unlockedIcons.length
  }

  /**
   * Reshuffle the remaining icon pool
   */
  reshufflePool(seed?: number): void {
    if (seed !== undefined) {
      this.random.reset(seed)
    }
    this.iconPool = shuffle(this.iconPool, this.random)
  }

  /**
   * Serialize state for saving
   */
  serialize(): {
    unlockedIcons: { name: string; tier: number }[]
    seed: number
  } {
    return {
      unlockedIcons: this.unlockedIcons.map((icon) => ({
        name: icon.name,
        tier: icon.tier,
      })),
      seed: this.random['seed'], // Access private seed for serialization
    }
  }

  /**
   * Deserialize state from save data
   */
  deserialize(data: { unlockedIcons: { name: string; tier: number }[]; seed: number }): void {
    this.random.reset(data.seed)
    this.initialize()

    // Restore unlocked icons
    this.unlockedIcons = []
    const unlockedNames = new Set(data.unlockedIcons.map((i) => i.name))

    for (const icon of this.allIcons) {
      if (unlockedNames.has(icon.name)) {
        const savedIcon = data.unlockedIcons.find((i) => i.name === icon.name)!
        icon.tier = savedIcon.tier
        icon.unlocked = true
        this.unlockedIcons.push(icon)
      }
    }

    // Remove unlocked icons from pool
    this.iconPool = this.iconPool.filter((icon) => !unlockedNames.has(icon.name))
  }
}
