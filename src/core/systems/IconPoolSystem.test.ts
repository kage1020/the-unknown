import { describe, it, expect, beforeEach } from 'vitest'
import { IconPoolSystem } from './IconPoolSystem'

describe('IconPoolSystem', () => {
  let iconPool: IconPoolSystem

  beforeEach(() => {
    iconPool = new IconPoolSystem(12345) // Use fixed seed for deterministic tests
  })

  describe('initialization', () => {
    it('should initialize with icons', () => {
      const totalIcons = iconPool.getTotalIconCount()
      expect(totalIcons).toBeGreaterThan(0)
    })

    it('should have no unlocked icons initially', () => {
      const unlockedCount = iconPool.getUnlockedIconCount()
      expect(unlockedCount).toBe(0)
    })

    it('should have consistent pool with same seed', () => {
      const pool1 = new IconPoolSystem(12345)
      const pool2 = new IconPoolSystem(12345)

      const icon1 = pool1.unlockNext(1)
      const icon2 = pool2.unlockNext(1)

      expect(icon1?.name).toBe(icon2?.name)
    })

    it('should have different pool with different seed', () => {
      const pool1 = new IconPoolSystem(12345)
      const pool2 = new IconPoolSystem(54321)

      const icons1: string[] = []
      const icons2: string[] = []

      for (let i = 0; i < 10; i++) {
        const icon1 = pool1.unlockNext(1)
        const icon2 = pool2.unlockNext(1)
        if (icon1) icons1.push(icon1.name)
        if (icon2) icons2.push(icon2.name)
      }

      expect(icons1).not.toEqual(icons2)
    })
  })

  describe('unlockNext', () => {
    it('should unlock an icon', () => {
      const icon = iconPool.unlockNext(1)

      expect(icon).not.toBeNull()
      expect(icon?.tier).toBe(1)
      expect(icon?.unlocked).toBe(true)
    })

    it('should increase unlocked count', () => {
      const initialCount = iconPool.getUnlockedIconCount()

      iconPool.unlockNext(1)
      iconPool.unlockNext(1)

      const newCount = iconPool.getUnlockedIconCount()
      expect(newCount).toBe(initialCount + 2)
    })

    it('should unlock different icons', () => {
      const icon1 = iconPool.unlockNext(1)
      const icon2 = iconPool.unlockNext(1)

      expect(icon1?.name).not.toBe(icon2?.name)
    })

    it('should return null when pool is empty', () => {
      const totalIcons = iconPool.getTotalIconCount()

      // Unlock all icons
      for (let i = 0; i < totalIcons; i++) {
        iconPool.unlockNext(1)
      }

      // Try to unlock one more
      const icon = iconPool.unlockNext(1)
      expect(icon).toBeNull()
    })

    it('should set correct tier', () => {
      const icon1 = iconPool.unlockNext(1)
      const icon2 = iconPool.unlockNext(2)
      const icon3 = iconPool.unlockNext(5)

      expect(icon1?.tier).toBe(1)
      expect(icon2?.tier).toBe(2)
      expect(icon3?.tier).toBe(5)
    })
  })

  describe('getUnlockedIcons', () => {
    it('should return empty array initially', () => {
      const icons = iconPool.getUnlockedIcons()
      expect(icons).toHaveLength(0)
    })

    it('should return all unlocked icons', () => {
      iconPool.unlockNext(1)
      iconPool.unlockNext(1)
      iconPool.unlockNext(2)

      const icons = iconPool.getUnlockedIcons()
      expect(icons).toHaveLength(3)
    })

    it('should return copy of array', () => {
      iconPool.unlockNext(1)

      const icons1 = iconPool.getUnlockedIcons()
      const icons2 = iconPool.getUnlockedIcons()

      expect(icons1).not.toBe(icons2) // Different references
      expect(icons1).toEqual(icons2) // Same content
    })
  })

  describe('getIconsForTier', () => {
    it('should return icons for specific tier', () => {
      iconPool.unlockNext(1)
      iconPool.unlockNext(1)
      iconPool.unlockNext(2)
      iconPool.unlockNext(2)
      iconPool.unlockNext(3)

      const tier1Icons = iconPool.getIconsForTier(1)
      const tier2Icons = iconPool.getIconsForTier(2)
      const tier3Icons = iconPool.getIconsForTier(3)

      expect(tier1Icons).toHaveLength(2)
      expect(tier2Icons).toHaveLength(2)
      expect(tier3Icons).toHaveLength(1)
    })

    it('should return empty array for tier with no icons', () => {
      iconPool.unlockNext(1)

      const tier5Icons = iconPool.getIconsForTier(5)
      expect(tier5Icons).toHaveLength(0)
    })
  })

  describe('isIconUnlocked', () => {
    it('should return false for locked icon', () => {
      expect(iconPool.isIconUnlocked('Star')).toBe(false)
    })

    it('should return true for unlocked icon', () => {
      const icon = iconPool.unlockNext(1)

      if (icon) {
        expect(iconPool.isIconUnlocked(icon.name)).toBe(true)
      }
    })
  })

  describe('reshufflePool', () => {
    it('should change unlock order', () => {
      const pool1 = new IconPoolSystem(12345)
      const pool2 = new IconPoolSystem(12345)

      const icon1 = pool1.unlockNext(1)

      pool2.reshufflePool(54321)
      const icon2 = pool2.unlockNext(1)

      expect(icon1?.name).not.toBe(icon2?.name)
    })

    it('should not affect already unlocked icons', () => {
      const icon1 = iconPool.unlockNext(1)
      const icon2 = iconPool.unlockNext(1)

      const unlockedBefore = iconPool.getUnlockedIcons()

      iconPool.reshufflePool(99999)

      const unlockedAfter = iconPool.getUnlockedIcons()

      expect(unlockedBefore).toEqual(unlockedAfter)
    })
  })

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize correctly', () => {
      const icon1 = iconPool.unlockNext(1)
      const icon2 = iconPool.unlockNext(2)
      const icon3 = iconPool.unlockNext(1)

      const serialized = iconPool.serialize()

      const newPool = new IconPoolSystem()
      newPool.deserialize(serialized)

      const unlockedIcons = newPool.getUnlockedIcons()
      expect(unlockedIcons).toHaveLength(3)

      expect(newPool.isIconUnlocked(icon1!.name)).toBe(true)
      expect(newPool.isIconUnlocked(icon2!.name)).toBe(true)
      expect(newPool.isIconUnlocked(icon3!.name)).toBe(true)
    })

    it('should preserve tier information', () => {
      iconPool.unlockNext(1)
      iconPool.unlockNext(2)
      iconPool.unlockNext(3)

      const serialized = iconPool.serialize()

      const newPool = new IconPoolSystem()
      newPool.deserialize(serialized)

      const tier1Icons = newPool.getIconsForTier(1)
      const tier2Icons = newPool.getIconsForTier(2)
      const tier3Icons = newPool.getIconsForTier(3)

      expect(tier1Icons).toHaveLength(1)
      expect(tier2Icons).toHaveLength(1)
      expect(tier3Icons).toHaveLength(1)
    })

    it('should preserve seed', () => {
      iconPool.unlockNext(1)
      iconPool.unlockNext(1)

      const serialized = iconPool.serialize()

      const newPool1 = new IconPoolSystem()
      newPool1.deserialize(serialized)

      const newPool2 = new IconPoolSystem()
      newPool2.deserialize(serialized)

      const icon1 = newPool1.unlockNext(1)
      const icon2 = newPool2.unlockNext(1)

      expect(icon1?.name).toBe(icon2?.name)
    })

    it('should restore unlocked count', () => {
      for (let i = 0; i < 5; i++) {
        iconPool.unlockNext(1)
      }

      const countBefore = iconPool.getUnlockedIconCount()
      const serialized = iconPool.serialize()

      const newPool = new IconPoolSystem()
      newPool.deserialize(serialized)

      const countAfter = newPool.getUnlockedIconCount()
      expect(countAfter).toBe(countBefore)
    })
  })
})
