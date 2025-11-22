import { describe, it, expect } from 'vitest'
import {
  hashString,
  hashRecipe,
  calculateRarity,
  generateResourceId,
  generateRecipeId,
} from './hash'

describe('hash', () => {
  describe('hashString', () => {
    it('should generate consistent hash for same string', () => {
      const hash1 = hashString('test')
      const hash2 = hashString('test')
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different strings', () => {
      const hash1 = hashString('test1')
      const hash2 = hashString('test2')
      expect(hash1).not.toBe(hash2)
    })

    it('should return positive numbers', () => {
      const hash = hashString('test')
      expect(hash).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty string', () => {
      const hash = hashString('')
      expect(hash).toBe(0)
    })
  })

  describe('hashRecipe', () => {
    it('should generate consistent hash for same recipe', () => {
      const hash1 = hashRecipe(['character:1', 'icon:Star'], 'character:2')
      const hash2 = hashRecipe(['character:1', 'icon:Star'], 'character:2')
      expect(hash1).toBe(hash2)
    })

    it('should sort inputs before hashing', () => {
      const hash1 = hashRecipe(['character:1', 'icon:Star'], 'character:2')
      const hash2 = hashRecipe(['icon:Star', 'character:1'], 'character:2')
      expect(hash1).toBe(hash2)
    })

    it('should generate different hash for different outputs', () => {
      const hash1 = hashRecipe(['character:1'], 'character:2')
      const hash2 = hashRecipe(['character:1'], 'character:3')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('calculateRarity', () => {
    it('should return value between 0 and 1', () => {
      const rarity1 = calculateRarity(12345)
      const rarity2 = calculateRarity(99999)
      const rarity3 = calculateRarity(1)

      expect(rarity1).toBeGreaterThanOrEqual(0)
      expect(rarity1).toBeLessThanOrEqual(1)
      expect(rarity2).toBeGreaterThanOrEqual(0)
      expect(rarity2).toBeLessThanOrEqual(1)
      expect(rarity3).toBeGreaterThanOrEqual(0)
      expect(rarity3).toBeLessThanOrEqual(1)
    })

    it('should be consistent for same hash', () => {
      const rarity1 = calculateRarity(12345)
      const rarity2 = calculateRarity(12345)
      expect(rarity1).toBe(rarity2)
    })

    it('should apply exponential distribution', () => {
      // With exponential distribution, lower values should be more common
      const rarities = Array.from({ length: 100 }, (_, i) => calculateRarity(i * 100))
      const lowRarities = rarities.filter((r) => r < 0.5).length
      const highRarities = rarities.filter((r) => r >= 0.5).length

      // Most values should be in the lower half due to exponential distribution
      expect(lowRarities).toBeGreaterThan(highRarities)
    })
  })

  describe('generateResourceId', () => {
    it('should generate correct format', () => {
      const id = generateResourceId('character', '1')
      expect(id).toBe('character:1')
    })

    it('should handle icon type', () => {
      const id = generateResourceId('icon', 'Star')
      expect(id).toBe('icon:Star')
    })
  })

  describe('generateRecipeId', () => {
    it('should generate correct format', () => {
      const id = generateRecipeId(['character:1', 'icon:Star'], 'character:2')
      expect(id).toBe('character:1+icon:Star->character:2')
    })

    it('should sort inputs', () => {
      const id1 = generateRecipeId(['character:1', 'icon:Star'], 'character:2')
      const id2 = generateRecipeId(['icon:Star', 'character:1'], 'character:2')
      expect(id1).toBe(id2)
    })

    it('should handle single input', () => {
      const id = generateRecipeId(['character:1'], 'character:2')
      expect(id).toBe('character:1->character:2')
    })
  })
})
