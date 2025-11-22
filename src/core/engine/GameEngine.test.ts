import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from './GameEngine'
import type { Building } from '../../stores/types'

describe('GameEngine', () => {
  let gameEngine: GameEngine

  beforeEach(() => {
    vi.useFakeTimers()
    gameEngine = new GameEngine()
  })

  afterEach(() => {
    gameEngine.stop()
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with correct defaults', () => {
      expect(gameEngine.getTier()).toBe(1)
      expect(gameEngine.getLevel()).toBe(1)
      expect(gameEngine.getExperience()).toBe(0n)
      expect(gameEngine.getTickCount()).toBe(0n)
    })

    it('should initialize grid system', () => {
      const gridSystem = gameEngine.getGridSystem()
      const size = gridSystem.getSize()

      expect(size.width).toBe(5)
      expect(size.height).toBe(5)
    })

    it('should initialize resource system with starting resources', () => {
      const resourceSystem = gameEngine.getResourceSystem()
      const resources = resourceSystem.getAllResources()

      // Should have at least one character and one icon unlocked
      expect(resources.length).toBeGreaterThan(0)

      // First character should have starting count
      const firstChar = resourceSystem.getResource({ type: 'character', value: '1' })
      expect(firstChar).not.toBeNull()
      expect(firstChar?.count).toBe(10n)
    })

    it('should initialize icon pool system', () => {
      const iconPool = gameEngine.getIconPoolSystem()
      const totalIcons = iconPool.getTotalIconCount()
      const unlockedCount = iconPool.getUnlockedIconCount()

      expect(totalIcons).toBeGreaterThan(0)
      expect(unlockedCount).toBe(1) // One icon unlocked initially
    })

    it('should not be running initially', () => {
      expect(gameEngine.isRunning()).toBe(false)
    })
  })

  describe('engine control', () => {
    it('should start the engine', () => {
      gameEngine.start()
      expect(gameEngine.isRunning()).toBe(true)
    })

    it('should stop the engine', () => {
      gameEngine.start()
      gameEngine.stop()
      expect(gameEngine.isRunning()).toBe(false)
    })

    it('should increment tick count when running', () => {
      const initialTicks = gameEngine.getTickCount()

      gameEngine.start()
      vi.advanceTimersByTime(1000) // Advance by 1 second (10 ticks at 10 ticks/second)

      const newTicks = gameEngine.getTickCount()
      expect(newTicks).toBeGreaterThan(initialTicks)
    })

    it('should not increment ticks when stopped', () => {
      gameEngine.start()
      vi.advanceTimersByTime(500)
      gameEngine.stop()

      const ticksAtStop = gameEngine.getTickCount()

      vi.advanceTimersByTime(500)

      const ticksAfterStop = gameEngine.getTickCount()
      expect(ticksAfterStop).toBe(ticksAtStop)
    })
  })

  describe('building management', () => {
    it('should place building on grid', () => {
      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
        direction: 'right',
        tier: 1,
      }

      const success = gameEngine.placeBuilding(building)
      expect(success).toBe(true)

      const gridSystem = gameEngine.getGridSystem()
      const placed = gridSystem.getBuilding(2, 2)
      expect(placed).toBe(building)
    })

    it('should remove building from grid', () => {
      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
        direction: 'right',
        tier: 1,
      }

      gameEngine.placeBuilding(building)
      const removed = gameEngine.removeBuilding(2, 2)

      expect(removed).toBe(building)

      const gridSystem = gameEngine.getGridSystem()
      const cell = gridSystem.getBuilding(2, 2)
      expect(cell).toBeNull()
    })

    it('should call onStateChange when building is placed', () => {
      const onStateChange = vi.fn()
      const engine = new GameEngine(onStateChange)

      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
        direction: 'right',
        tier: 1,
      }

      engine.placeBuilding(building)

      expect(onStateChange).toHaveBeenCalled()

      engine.stop()
    })
  })

  describe('experience and leveling', () => {
    it('should add experience', () => {
      gameEngine.addExperience(50n)
      expect(gameEngine.getExperience()).toBe(50n)
    })

    it('should level up when enough experience', () => {
      const initialLevel = gameEngine.getLevel()

      // Add enough experience to level up
      gameEngine.addExperience(100n)

      const newLevel = gameEngine.getLevel()
      expect(newLevel).toBe(initialLevel + 1)
    })

    it('should carry over excess experience', () => {
      // Add more than enough for one level
      gameEngine.addExperience(150n)

      expect(gameEngine.getLevel()).toBe(2)
      expect(gameEngine.getExperience()).toBe(50n) // 150 - 100 (requirement for level 1->2)
    })

    it('should require more experience for higher levels', () => {
      // Level 1->2 requires 100
      gameEngine.addExperience(100n)
      expect(gameEngine.getLevel()).toBe(2)
      expect(gameEngine.getExperience()).toBe(0n)

      // Level 2->3 requires more (100 * 1.5 = 150)
      gameEngine.addExperience(149n)
      expect(gameEngine.getLevel()).toBe(2) // Should not level up yet

      gameEngine.addExperience(1n)
      expect(gameEngine.getLevel()).toBe(3) // Should level up now
    })
  })

  describe('state change callback', () => {
    it('should call onStateChange during tick', () => {
      const onStateChange = vi.fn()
      const engine = new GameEngine(onStateChange)

      engine.start()
      vi.advanceTimersByTime(100) // Advance by 100ms (1 tick at 10 ticks/second)

      expect(onStateChange).toHaveBeenCalled()

      engine.stop()
    })

    it('should call onStateChange on level up', () => {
      const onStateChange = vi.fn()
      const engine = new GameEngine(onStateChange)

      onStateChange.mockClear() // Clear initial calls
      engine.addExperience(100n)

      expect(onStateChange).toHaveBeenCalled()

      engine.stop()
    })
  })

  describe('serialize/deserialize', () => {
    it('should serialize game state', () => {
      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 1, y: 1 },
        direction: 'right',
        tier: 1,
      }

      gameEngine.placeBuilding(building)
      gameEngine.addExperience(50n)

      gameEngine.start()
      vi.advanceTimersByTime(500)
      gameEngine.stop()

      const serialized = gameEngine.serialize()

      expect(serialized.tier).toBe(1)
      expect(serialized.level).toBe(1)
      expect(serialized.experience).toBe('50')
      expect(serialized.tickCount).not.toBe('0')
      expect(serialized.grid).toBeDefined()
      expect(serialized.resources).toBeDefined()
      expect(serialized.icons).toBeDefined()
      expect(serialized.flow).toBeDefined()
    })

    it('should deserialize game state', () => {
      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 1, y: 1 },
        direction: 'right',
        tier: 1,
      }

      gameEngine.placeBuilding(building)
      gameEngine.addExperience(50n)

      gameEngine.start()
      vi.advanceTimersByTime(500)
      gameEngine.stop()

      const serialized = gameEngine.serialize()

      // Create new engine and deserialize
      const newEngine = new GameEngine()
      newEngine.deserialize(serialized)

      expect(newEngine.getTier()).toBe(1)
      expect(newEngine.getLevel()).toBe(1)
      expect(newEngine.getExperience()).toBe(50n)

      const gridSystem = newEngine.getGridSystem()
      const restoredBuilding = gridSystem.getBuilding(1, 1)
      expect(restoredBuilding).not.toBeNull()
      expect(restoredBuilding?.id).toBe('test-1')

      newEngine.stop()
    })

    it('should preserve bigint values in serialization', () => {
      // Use a value that won't trigger level up
      gameEngine.addExperience(50n)

      const serialized = gameEngine.serialize()
      const newEngine = new GameEngine()
      newEngine.deserialize(serialized)

      expect(newEngine.getExperience()).toBe(50n)

      newEngine.stop()
    })
  })

  describe('system integration', () => {
    it('should integrate all systems correctly', () => {
      const gridSystem = gameEngine.getGridSystem()
      const resourceSystem = gameEngine.getResourceSystem()
      const iconPool = gameEngine.getIconPoolSystem()

      expect(gridSystem).toBeDefined()
      expect(resourceSystem).toBeDefined()
      expect(iconPool).toBeDefined()
    })

    it('should process game loop with all systems', () => {
      const resourceSystem = gameEngine.getResourceSystem()
      const gridSystem = gameEngine.getGridSystem()
      resourceSystem.unlockCharacter('1', 1)

      // Place Generator building
      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 1, y: 2 },
        direction: 'right',
        tier: 1,
        recipe: {
          id: 'recipe-1',
          inputs: [],
          output: { type: 'character', value: '1' },
          tier: 1,
          discovered: true,
          rarity: 0,
        },
      }

      gameEngine.placeBuilding(generator)

      const resource = resourceSystem.getResource({ type: 'character', value: '1' })!
      const initialCount = resource.count

      // Run generator for 1 second (10 ticks = 1 generation cycle)
      gameEngine.start()
      vi.advanceTimersByTime(1000)
      gameEngine.stop()

      // Inventory should NOT increase (Generator doesn't add to inventory)
      const countAfterGen = resource.count
      expect(countAfterGen).toBe(initialCount)

      // But resource should be placed on grid (right of generator at 2,2)
      const gridResource = gridSystem.getResource(2, 2)
      expect(gridResource).not.toBeNull()
      expect(gridResource?.type).toBe('character')
      expect(gridResource?.value).toBe('1')

      // Now place Output building adjacent to the resource
      const output: Building = {
        id: 'output-1',
        type: 'Output',
        position: { x: 3, y: 2 },
        direction: 'left',
        tier: 1,
      }

      gameEngine.placeBuilding(output)

      // Run for one more tick to collect the resource
      gameEngine.start()
      vi.advanceTimersByTime(100) // 1 tick
      gameEngine.stop()

      // Now inventory should increase (Output collected from grid)
      const finalCount = resource.count
      expect(finalCount).toBeGreaterThan(initialCount)

      // Resource should be removed from grid
      const gridResourceAfter = gridSystem.getResource(2, 2)
      expect(gridResourceAfter).toBeNull()
    })
  })
})
