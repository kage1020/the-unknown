import { describe, it, expect } from 'vitest'
import {
  getBase58Char,
  getBase58Index,
  getAllBase58Chars,
  isValidBase58,
  getBase58CharsForTier,
} from './base58'

describe('base58', () => {
  describe('getBase58Char', () => {
    it('should return the correct character at index 0', () => {
      expect(getBase58Char(0)).toBe('1')
    })

    it('should return the correct character at index 10', () => {
      expect(getBase58Char(10)).toBe('B')
    })

    it('should throw error for negative index', () => {
      expect(() => getBase58Char(-1)).toThrow('Invalid base58 index: -1')
    })

    it('should throw error for index out of bounds', () => {
      expect(() => getBase58Char(100)).toThrow('Invalid base58 index: 100')
    })
  })

  describe('getBase58Index', () => {
    it('should return the correct index for "1"', () => {
      expect(getBase58Index('1')).toBe(0)
    })

    it('should return the correct index for "A"', () => {
      expect(getBase58Index('A')).toBe(9)
    })

    it('should throw error for invalid character', () => {
      expect(() => getBase58Index('0')).toThrow('Invalid base58 character: 0')
    })

    it('should throw error for invalid character "O"', () => {
      expect(() => getBase58Index('O')).toThrow('Invalid base58 character: O')
    })
  })

  describe('getAllBase58Chars', () => {
    it('should return all 58 characters', () => {
      const chars = getAllBase58Chars()
      expect(chars).toHaveLength(58)
    })

    it('should start with "1"', () => {
      const chars = getAllBase58Chars()
      expect(chars[0]).toBe('1')
    })

    it('should not contain "0", "O", "I", or "l"', () => {
      const chars = getAllBase58Chars()
      expect(chars).not.toContain('0')
      expect(chars).not.toContain('O')
      expect(chars).not.toContain('I')
      expect(chars).not.toContain('l')
    })
  })

  describe('isValidBase58', () => {
    it('should return true for valid characters', () => {
      expect(isValidBase58('1')).toBe(true)
      expect(isValidBase58('A')).toBe(true)
      expect(isValidBase58('z')).toBe(true)
    })

    it('should return false for invalid characters', () => {
      expect(isValidBase58('0')).toBe(false)
      expect(isValidBase58('O')).toBe(false)
      expect(isValidBase58('I')).toBe(false)
      expect(isValidBase58('l')).toBe(false)
      expect(isValidBase58('@')).toBe(false)
    })
  })

  describe('getBase58CharsForTier', () => {
    it('should return 1 character for tier 1', () => {
      const chars = getBase58CharsForTier(1)
      expect(chars).toHaveLength(1)
      expect(chars[0]).toBe('1')
    })

    it('should return 5 characters for tier 5', () => {
      const chars = getBase58CharsForTier(5)
      expect(chars).toHaveLength(5)
      expect(chars).toEqual(['1', '2', '3', '4', '5'])
    })

    it('should not exceed total base58 characters', () => {
      const chars = getBase58CharsForTier(100)
      expect(chars).toHaveLength(58)
    })
  })
})
