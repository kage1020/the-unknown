/**
 * Simple hash function for generating recipe IDs and rarity
 * Uses a simple string hashing algorithm
 */
export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate a hash for a recipe based on inputs and output
 */
export function hashRecipe(inputs: string[], output: string): number {
  const inputStr = inputs.sort().join(',')
  const recipeStr = `${inputStr}->${output}`
  return hashString(recipeStr)
}

/**
 * Calculate rarity from hash (0-1)
 * Lower values are more common, higher values are rarer
 */
export function calculateRarity(hash: number): number {
  // Use the hash to generate a value between 0 and 1
  // Distribution is weighted towards lower values (more common recipes)
  const normalized = (hash % 10000) / 10000
  // Apply exponential distribution to make rare items actually rare
  return Math.pow(normalized, 2)
}

/**
 * Generate a unique ID for a resource
 */
export function generateResourceId(type: string, value: string): string {
  return `${type}:${value}`
}

/**
 * Generate a unique ID for a recipe
 */
export function generateRecipeId(inputs: string[], output: string): string {
  const inputStr = inputs.sort().join('+')
  return `${inputStr}->${output}`
}
