import type { Recipe, ResourceId } from '../../stores/types'
import { hashString } from '../utils/hash'

/**
 * Collection System
 * Manages recipe generation, discovery, and collection tracking
 */
export class CollectionSystem {
  private recipes: Map<string, Recipe> = new Map()

  /**
   * Generate all possible recipes for given resources
   * Recipes are deterministic based on resource combinations
   */
  generateRecipes(
    characterResources: string[],
    iconResources: string[],
    tier: number
  ): Recipe[] {
    const newRecipes: Recipe[] = []

    // Generate single-input recipes (Tier 1+)
    for (const char of characterResources) {
      const recipe = this.createRecipe([{ type: 'character', value: char }], tier)
      newRecipes.push(recipe)
    }

    for (const icon of iconResources) {
      const recipe = this.createRecipe([{ type: 'icon', value: icon }], tier)
      newRecipes.push(recipe)
    }

    // Generate two-input recipes (character + character)
    if (tier >= 2 && characterResources.length >= 2) {
      for (let i = 0; i < characterResources.length; i++) {
        for (let j = i; j < characterResources.length; j++) {
          const recipe = this.createRecipe(
            [
              { type: 'character', value: characterResources[i] },
              { type: 'character', value: characterResources[j] },
            ],
            tier
          )
          newRecipes.push(recipe)
        }
      }
    }

    // Generate two-input recipes (icon + icon)
    if (tier >= 2 && iconResources.length >= 2) {
      for (let i = 0; i < iconResources.length; i++) {
        for (let j = i; j < iconResources.length; j++) {
          const recipe = this.createRecipe(
            [
              { type: 'icon', value: iconResources[i] },
              { type: 'icon', value: iconResources[j] },
            ],
            tier
          )
          newRecipes.push(recipe)
        }
      }
    }

    // Generate mixed recipes (character + icon)
    if (tier >= 2) {
      for (const char of characterResources) {
        for (const icon of iconResources) {
          const recipe = this.createRecipe(
            [
              { type: 'character', value: char },
              { type: 'icon', value: icon },
            ],
            tier
          )
          newRecipes.push(recipe)
        }
      }
    }

    // Add new recipes to collection
    for (const recipe of newRecipes) {
      if (!this.recipes.has(recipe.id)) {
        this.recipes.set(recipe.id, recipe)
      }
    }

    return newRecipes
  }

  /**
   * Create a recipe from inputs
   * Output is determined by hashing the inputs
   */
  private createRecipe(inputs: ResourceId[], tier: number): Recipe {
    // Sort inputs for consistency
    const sortedInputs = [...inputs].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      return a.value.localeCompare(b.value)
    })

    // Generate recipe ID
    const recipeId = sortedInputs.map(i => `${i.type}:${i.value}`).join('+')

    // Generate output based on hash
    const hash = hashString(recipeId)
    const outputType = hash % 2 === 0 ? 'character' : 'icon'
    const outputValue = this.hashToResourceValue(hash, outputType)

    // Calculate rarity (0-1) based on hash
    const rarity = this.calculateRarity(hash)

    const output: ResourceId = {
      type: outputType,
      value: outputValue,
    }

    return {
      id: recipeId,
      inputs: sortedInputs,
      output,
      tier,
      discovered: false,
      rarity,
    }
  }

  /**
   * Convert hash to a resource value
   */
  private hashToResourceValue(hash: number, type: 'character' | 'icon'): string {
    if (type === 'character') {
      // Use base58 characters
      const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
      return BASE58_CHARS[hash % BASE58_CHARS.length]
    } else {
      // For icons, we'll use a predefined list or generate a placeholder
      // This will be integrated with IconPoolSystem later
      return `icon-${hash % 1000}`
    }
  }

  /**
   * Calculate rarity from hash (0 = common, 1 = legendary)
   */
  private calculateRarity(hash: number): number {
    // Use hash to generate a value between 0 and 1
    // Distribution: 70% common, 20% rare, 8% epic, 2% legendary
    const normalized = (hash % 10000) / 10000

    if (normalized < 0.7) return 0.0 // Common
    if (normalized < 0.9) return 0.5 // Rare
    if (normalized < 0.98) return 0.8 // Epic
    return 1.0 // Legendary
  }

  /**
   * Mark a recipe as discovered
   */
  discoverRecipe(recipeId: string): boolean {
    const recipe = this.recipes.get(recipeId)
    if (recipe && !recipe.discovered) {
      recipe.discovered = true
      return true
    }
    return false
  }

  /**
   * Check if a recipe matches given inputs and mark as discovered
   */
  onCraft(inputs: ResourceId[]): Recipe | null {
    // Sort inputs to match recipe format
    const sortedInputs = [...inputs].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      return a.value.localeCompare(b.value)
    })

    const recipeId = sortedInputs.map(i => `${i.type}:${i.value}`).join('+')
    const recipe = this.recipes.get(recipeId)

    if (recipe) {
      this.discoverRecipe(recipeId)
      return recipe
    }

    return null
  }

  /**
   * Get all recipes
   */
  getAllRecipes(): Recipe[] {
    return Array.from(this.recipes.values())
  }

  /**
   * Get discovered recipes
   */
  getDiscoveredRecipes(): Recipe[] {
    return Array.from(this.recipes.values()).filter(r => r.discovered)
  }

  /**
   * Get undiscovered recipes
   */
  getUndiscoveredRecipes(): Recipe[] {
    return Array.from(this.recipes.values()).filter(r => !r.discovered)
  }

  /**
   * Get recipes by tier
   */
  getRecipesByTier(tier: number): Recipe[] {
    return Array.from(this.recipes.values()).filter(r => r.tier === tier)
  }

  /**
   * Get recipe by ID
   */
  getRecipe(recipeId: string): Recipe | null {
    return this.recipes.get(recipeId) || null
  }

  /**
   * Get discovery progress
   */
  getProgress(): { discovered: number; total: number; percentage: number } {
    const total = this.recipes.size
    const discovered = this.getDiscoveredRecipes().length
    const percentage = total > 0 ? (discovered / total) * 100 : 0

    return { discovered, total, percentage }
  }

  /**
   * Serialize state for saving
   */
  serialize(): {
    recipes: {
      id: string
      inputs: string[]
      output: string
      tier: number
      discovered: boolean
      rarity: number
    }[]
  } {
    return {
      recipes: Array.from(this.recipes.values()).map(recipe => ({
        id: recipe.id,
        inputs: recipe.inputs.map(i => `${i.type}:${i.value}`),
        output: `${recipe.output.type}:${recipe.output.value}`,
        tier: recipe.tier,
        discovered: recipe.discovered,
        rarity: recipe.rarity,
      })),
    }
  }

  /**
   * Deserialize state from save data
   */
  deserialize(data: {
    recipes: {
      id: string
      inputs: string[]
      output: string
      tier: number
      discovered: boolean
      rarity: number
    }[]
  }): void {
    this.recipes.clear()

    for (const recipeData of data.recipes) {
      const recipe: Recipe = {
        id: recipeData.id,
        inputs: recipeData.inputs.map(input => {
          const [type, value] = input.split(':')
          return { type: type as 'character' | 'icon', value }
        }),
        output: (() => {
          const [type, value] = recipeData.output.split(':')
          return { type: type as 'character' | 'icon', value }
        })(),
        tier: recipeData.tier,
        discovered: recipeData.discovered,
        rarity: recipeData.rarity,
      }

      this.recipes.set(recipe.id, recipe)
    }
  }
}
