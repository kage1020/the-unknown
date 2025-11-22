import { describe, it, expect } from 'vitest'
import { SeededRandom, shuffle, randomElement, randomElements } from './random'

describe('random', () => {
  describe('SeededRandom', () => {
    it('should generate consistent sequence with same seed', () => {
      const rng1 = new SeededRandom(12345)
      const rng2 = new SeededRandom(12345)

      const sequence1 = Array.from({ length: 10 }, () => rng1.next())
      const sequence2 = Array.from({ length: 10 }, () => rng2.next())

      expect(sequence1).toEqual(sequence2)
    })

    it('should generate different sequences with different seeds', () => {
      const rng1 = new SeededRandom(12345)
      const rng2 = new SeededRandom(54321)

      const sequence1 = Array.from({ length: 10 }, () => rng1.next())
      const sequence2 = Array.from({ length: 10 }, () => rng2.next())

      expect(sequence1).not.toEqual(sequence2)
    })

    it('should generate values between 0 and 1', () => {
      const rng = new SeededRandom(12345)

      for (let i = 0; i < 100; i++) {
        const value = rng.next()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })

    it('should reset to same sequence when seed is reset', () => {
      const rng = new SeededRandom(12345)
      const sequence1 = Array.from({ length: 10 }, () => rng.next())

      rng.reset(12345)
      const sequence2 = Array.from({ length: 10 }, () => rng.next())

      expect(sequence1).toEqual(sequence2)
    })

    describe('nextInt', () => {
      it('should generate integers in range', () => {
        const rng = new SeededRandom(12345)

        for (let i = 0; i < 100; i++) {
          const value = rng.nextInt(0, 10)
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThan(10)
          expect(Number.isInteger(value)).toBe(true)
        }
      })

      it('should work with different ranges', () => {
        const rng = new SeededRandom(12345)
        const value = rng.nextInt(5, 15)
        expect(value).toBeGreaterThanOrEqual(5)
        expect(value).toBeLessThan(15)
      })
    })
  })

  describe('shuffle', () => {
    it('should return array of same length', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffle(arr, rng)

      expect(shuffled).toHaveLength(arr.length)
    })

    it('should contain same elements', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffle(arr, rng)

      expect(shuffled.sort()).toEqual(arr.sort())
    })

    it('should not modify original array', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const original = [...arr]
      shuffle(arr, rng)

      expect(arr).toEqual(original)
    })

    it('should produce consistent shuffle with same seed', () => {
      const arr = [1, 2, 3, 4, 5]

      const rng1 = new SeededRandom(12345)
      const shuffled1 = shuffle(arr, rng1)

      const rng2 = new SeededRandom(12345)
      const shuffled2 = shuffle(arr, rng2)

      expect(shuffled1).toEqual(shuffled2)
    })

    it('should produce different shuffle with different seed', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      const rng1 = new SeededRandom(12345)
      const shuffled1 = shuffle(arr, rng1)

      const rng2 = new SeededRandom(54321)
      const shuffled2 = shuffle(arr, rng2)

      expect(shuffled1).not.toEqual(shuffled2)
    })
  })

  describe('randomElement', () => {
    it('should return an element from the array', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const element = randomElement(arr, rng)

      expect(arr).toContain(element)
    })

    it('should be consistent with same seed', () => {
      const arr = [1, 2, 3, 4, 5]

      const rng1 = new SeededRandom(12345)
      const element1 = randomElement(arr, rng1)

      const rng2 = new SeededRandom(12345)
      const element2 = randomElement(arr, rng2)

      expect(element1).toBe(element2)
    })
  })

  describe('randomElements', () => {
    it('should return requested number of elements', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const elements = randomElements(arr, 3, rng)

      expect(elements).toHaveLength(3)
    })

    it('should not exceed array length', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const elements = randomElements(arr, 10, rng)

      expect(elements).toHaveLength(5)
    })

    it('should return unique elements', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const elements = randomElements(arr, 3, rng)

      const unique = new Set(elements)
      expect(unique.size).toBe(elements.length)
    })

    it('should contain only elements from original array', () => {
      const rng = new SeededRandom(12345)
      const arr = [1, 2, 3, 4, 5]
      const elements = randomElements(arr, 3, rng)

      for (const element of elements) {
        expect(arr).toContain(element)
      }
    })
  })
})
