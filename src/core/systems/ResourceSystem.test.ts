import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceSystem } from './ResourceSystem'

describe('ResourceSystem', () => {
  let resourceSystem: ResourceSystem

  beforeEach(() => {
    resourceSystem = new ResourceSystem()
  })

  describe('unlockCharacter', () => {
    it('should unlock a character resource', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)

      expect(resource.type).toBe('character')
      expect(resource.value).toBe('1')
      expect(resource.tier).toBe(1)
      expect(resource.count).toBe(0n)
    })

    it('should return existing resource if already unlocked', () => {
      const resource1 = resourceSystem.unlockCharacter('1', 1)
      const resource2 = resourceSystem.unlockCharacter('1', 1)

      expect(resource1).toBe(resource2)
    })

    it('should unlock multiple different characters', () => {
      resourceSystem.unlockCharacter('1', 1)
      resourceSystem.unlockCharacter('2', 1)

      const resources = resourceSystem.getAllResources()
      expect(resources).toHaveLength(2)
    })
  })

  describe('unlockIcon', () => {
    it('should unlock an icon resource', () => {
      const resource = resourceSystem.unlockIcon('Star', 1)

      expect(resource.type).toBe('icon')
      expect(resource.iconName).toBe('Star')
      expect(resource.tier).toBe(1)
      expect(resource.count).toBe(0n)
    })

    it('should return existing resource if already unlocked', () => {
      const resource1 = resourceSystem.unlockIcon('Star', 1)
      const resource2 = resourceSystem.unlockIcon('Star', 1)

      expect(resource1).toBe(resource2)
    })
  })

  describe('produce', () => {
    it('should increase resource count', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resourceSystem.produce({ type: 'character', value: '1' }, 5n)

      expect(resource.count).toBe(5n)
    })

    it('should accumulate production', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resourceSystem.produce({ type: 'character', value: '1' }, 5n)
      resourceSystem.produce({ type: 'character', value: '1' }, 3n)

      expect(resource.count).toBe(8n)
    })

    it('should return false for non-existent resource', () => {
      const result = resourceSystem.produce({ type: 'character', value: '9' }, 1n)
      expect(result).toBe(false)
    })

    it('should default to 1 if amount not specified', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resourceSystem.produce({ type: 'character', value: '1' })

      expect(resource.count).toBe(1n)
    })
  })

  describe('consume', () => {
    it('should decrease resource count', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resource.count = 10n

      const success = resourceSystem.consume({ type: 'character', value: '1' }, 3n)

      expect(success).toBe(true)
      expect(resource.count).toBe(7n)
    })

    it('should return false if insufficient resources', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resource.count = 5n

      const success = resourceSystem.consume({ type: 'character', value: '1' }, 10n)

      expect(success).toBe(false)
      expect(resource.count).toBe(5n) // Should not change
    })

    it('should return false for non-existent resource', () => {
      const result = resourceSystem.consume({ type: 'character', value: '9' }, 1n)
      expect(result).toBe(false)
    })
  })

  describe('hasEnough', () => {
    it('should return true if enough resources', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resource.count = 10n

      expect(resourceSystem.hasEnough({ type: 'character', value: '1' }, 5n)).toBe(true)
      expect(resourceSystem.hasEnough({ type: 'character', value: '1' }, 10n)).toBe(true)
    })

    it('should return false if insufficient resources', () => {
      const resource = resourceSystem.unlockCharacter('1', 1)
      resource.count = 5n

      expect(resourceSystem.hasEnough({ type: 'character', value: '1' }, 10n)).toBe(false)
    })

    it('should return false for non-existent resource', () => {
      expect(resourceSystem.hasEnough({ type: 'character', value: '9' }, 1n)).toBe(false)
    })
  })

  describe('getResource', () => {
    it('should return the resource', () => {
      const unlocked = resourceSystem.unlockCharacter('1', 1)
      const retrieved = resourceSystem.getResource({ type: 'character', value: '1' })

      expect(retrieved).toBe(unlocked)
    })

    it('should return null for non-existent resource', () => {
      const resource = resourceSystem.getResource({ type: 'character', value: '9' })
      expect(resource).toBeNull()
    })
  })

  describe('getAllResources', () => {
    it('should return empty array initially', () => {
      expect(resourceSystem.getAllResources()).toHaveLength(0)
    })

    it('should return all unlocked resources', () => {
      resourceSystem.unlockCharacter('1', 1)
      resourceSystem.unlockCharacter('2', 1)
      resourceSystem.unlockIcon('Star', 1)

      const resources = resourceSystem.getAllResources()
      expect(resources).toHaveLength(3)
    })
  })

  describe('getResourcesByType', () => {
    it('should return only character resources', () => {
      resourceSystem.unlockCharacter('1', 1)
      resourceSystem.unlockCharacter('2', 1)
      resourceSystem.unlockIcon('Star', 1)

      const characters = resourceSystem.getResourcesByType('character')
      expect(characters).toHaveLength(2)
      expect(characters.every((r) => r.type === 'character')).toBe(true)
    })

    it('should return only icon resources', () => {
      resourceSystem.unlockCharacter('1', 1)
      resourceSystem.unlockIcon('Star', 1)
      resourceSystem.unlockIcon('Heart', 1)

      const icons = resourceSystem.getResourcesByType('icon')
      expect(icons).toHaveLength(2)
      expect(icons.every((r) => r.type === 'icon')).toBe(true)
    })
  })

  describe('getResourcesByTier', () => {
    it('should return resources of specific tier', () => {
      resourceSystem.unlockCharacter('1', 1)
      resourceSystem.unlockCharacter('2', 2)
      resourceSystem.unlockCharacter('3', 2)

      const tier1 = resourceSystem.getResourcesByTier(1)
      const tier2 = resourceSystem.getResourcesByTier(2)

      expect(tier1).toHaveLength(1)
      expect(tier2).toHaveLength(2)
    })
  })

  describe('clearAll', () => {
    it('should reset all resource counts to 0', () => {
      const res1 = resourceSystem.unlockCharacter('1', 1)
      const res2 = resourceSystem.unlockCharacter('2', 1)

      res1.count = 100n
      res2.count = 50n

      resourceSystem.clearAll()

      expect(res1.count).toBe(0n)
      expect(res2.count).toBe(0n)
    })
  })

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize correctly', () => {
      const res1 = resourceSystem.unlockCharacter('1', 1)
      const res2 = resourceSystem.unlockIcon('Star', 1)

      res1.count = 100n
      res2.count = 50n

      const serialized = resourceSystem.serialize()

      const newSystem = new ResourceSystem()
      newSystem.deserialize(serialized)

      const resources = newSystem.getAllResources()
      expect(resources).toHaveLength(2)

      const char = newSystem.getResource({ type: 'character', value: '1' })
      expect(char?.count).toBe(100n)

      const icon = newSystem.getResource({ type: 'icon', value: 'Star' })
      expect(icon?.count).toBe(50n)
    })

    it('should handle bigint serialization', () => {
      const res = resourceSystem.unlockCharacter('1', 1)
      res.count = 999999999999999999n

      const serialized = resourceSystem.serialize()
      const newSystem = new ResourceSystem()
      newSystem.deserialize(serialized)

      const restored = newSystem.getResource({ type: 'character', value: '1' })
      expect(restored?.count).toBe(999999999999999999n)
    })
  })
})
