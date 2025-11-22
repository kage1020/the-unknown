import { TIER_CONFIG, GAME_CONFIG } from '../../lib/constants'

/**
 * Tier System
 * Manages tier progression and requirements
 */
export class TierSystem {
  /**
   * Check if player can advance to the next tier
   * Requirements:
   * - Minimum level
   * - Minimum recipes discovered
   * - Sufficient resources
   */
  canAdvanceTier(
    currentTier: number,
    level: number,
    recipesDiscovered: number,
    totalRecipes: number
  ): { canAdvance: boolean; reason?: string } {
    if (currentTier >= GAME_CONFIG.MAX_TIER) {
      return { canAdvance: false, reason: 'Maximum tier reached' }
    }

    // Level requirement: Need level >= tier * 2
    const requiredLevel = currentTier * 2
    if (level < requiredLevel) {
      return {
        canAdvance: false,
        reason: `Level ${requiredLevel} required (current: ${level})`,
      }
    }

    // Recipe discovery requirement: Need at least 50% of recipes discovered
    const discoveryPercentage = totalRecipes > 0 ? (recipesDiscovered / totalRecipes) * 100 : 100
    if (discoveryPercentage < 50) {
      return {
        canAdvance: false,
        reason: `Need 50% recipes discovered (current: ${discoveryPercentage.toFixed(1)}%)`,
      }
    }

    return { canAdvance: true }
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: number): {
    tier: number
    gridSize: number
    characters: number
    icons: number
  } {
    const config = TIER_CONFIG.find(t => t.tier === tier)
    if (!config) {
      throw new Error(`Invalid tier: ${tier}`)
    }
    return config
  }

  /**
   * Get all tier configurations
   */
  getAllTierConfigs(): typeof TIER_CONFIG {
    return TIER_CONFIG
  }

  /**
   * Calculate resources to unlock for a tier
   * Returns the characters and icons that should be available at this tier
   */
  getResourcesForTier(tier: number): {
    characters: string[]
    iconCount: number
  } {
    const config = this.getTierConfig(tier)
    const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

    // Get characters for this tier (first N characters from BASE58)
    const characters = BASE58_CHARS.slice(0, config.characters).split('')

    return {
      characters,
      iconCount: config.icons,
    }
  }

  /**
   * Get requirements for next tier
   */
  getNextTierRequirements(currentTier: number): {
    nextTier: number
    requiredLevel: number
    requiredRecipePercentage: number
    gridSize: number
    newCharacters: number
    newIcons: number
  } | null {
    if (currentTier >= GAME_CONFIG.MAX_TIER) {
      return null
    }

    const nextTier = currentTier + 1
    const nextConfig = this.getTierConfig(nextTier)

    return {
      nextTier,
      requiredLevel: currentTier * 2,
      requiredRecipePercentage: 50,
      gridSize: nextConfig.gridSize,
      newCharacters: nextConfig.characters,
      newIcons: nextConfig.icons,
    }
  }
}
