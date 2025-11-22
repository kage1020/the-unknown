import { BASE58_CHARS } from '../../lib/constants'

/**
 * Get base58 character by index
 */
export function getBase58Char(index: number): string {
  if (index < 0 || index >= BASE58_CHARS.length) {
    throw new Error(`Invalid base58 index: ${index}`)
  }
  return BASE58_CHARS[index]
}

/**
 * Get index of a base58 character
 */
export function getBase58Index(char: string): number {
  const index = BASE58_CHARS.indexOf(char)
  if (index === -1) {
    throw new Error(`Invalid base58 character: ${char}`)
  }
  return index
}

/**
 * Get all base58 characters
 */
export function getAllBase58Chars(): string[] {
  return BASE58_CHARS.split('')
}

/**
 * Check if a character is valid base58
 */
export function isValidBase58(char: string): boolean {
  return BASE58_CHARS.includes(char)
}

/**
 * Get base58 characters for a specific tier
 * Tier 1: first character
 * Tier 2: first 2 characters
 * etc.
 */
export function getBase58CharsForTier(tier: number): string[] {
  const count = Math.min(tier, BASE58_CHARS.length)
  return BASE58_CHARS.slice(0, count).split('')
}
