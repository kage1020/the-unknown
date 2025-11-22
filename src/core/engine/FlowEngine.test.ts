import { describe, it, expect, beforeEach } from 'vitest'
import { FlowEngine } from './FlowEngine'
import { GridSystem } from '../systems/GridSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import type { Building } from '../../stores/types'

describe('FlowEngine', () => {
  let flowEngine: FlowEngine
  let gridSystem: GridSystem
  let resourceSystem: ResourceSystem

  beforeEach(() => {
    gridSystem = new GridSystem(5)
    resourceSystem = new ResourceSystem()
    flowEngine = new FlowEngine(gridSystem, resourceSystem)
  })

  describe('Generator processing', () => {
    it('should generate resources after enough ticks', () => {
      // Setup: unlock a resource
      resourceSystem.unlockCharacter('1', 1)

      // Place a generator
      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
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

      gridSystem.placeBuilding(generator)

      // Initial resource count
      const resource = resourceSystem.getResource({ type: 'character', value: '1' })
      const initialCount = resource?.count || 0n

      // Run ticks (10 ticks required for generation)
      for (let i = 0; i < 10; i++) {
        flowEngine.tick()
      }

      // Resource should be produced
      const newCount = resource?.count || 0n
      expect(newCount).toBeGreaterThan(initialCount)
    })

    it('should place resource in direction of generator', () => {
      resourceSystem.unlockCharacter('1', 1)

      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
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

      gridSystem.placeBuilding(generator)

      // Run enough ticks to generate
      for (let i = 0; i < 10; i++) {
        flowEngine.tick()
      }

      // Check if resource is placed to the right (x: 3, y: 2) or on the building itself
      const rightCell = gridSystem.getResource(3, 2)
      const buildingCell = gridSystem.getResource(2, 2)

      expect(rightCell || buildingCell).not.toBeNull()
    })

    it('should continue generating after first production', () => {
      resourceSystem.unlockCharacter('1', 1)

      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
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

      gridSystem.placeBuilding(generator)

      const resource = resourceSystem.getResource({ type: 'character', value: '1' })!
      const initialCount = resource.count

      // First generation cycle
      for (let i = 0; i < 10; i++) {
        flowEngine.tick()
      }

      const countAfterFirst = resource.count

      // Second generation cycle
      for (let i = 0; i < 10; i++) {
        flowEngine.tick()
      }

      const countAfterSecond = resource.count

      expect(countAfterFirst).toBeGreaterThan(initialCount)
      expect(countAfterSecond).toBeGreaterThan(countAfterFirst)
    })

    it('should not generate if recipe is missing', () => {
      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
        direction: 'right',
        tier: 1,
        // No recipe
      }

      gridSystem.placeBuilding(generator)

      // Run ticks
      for (let i = 0; i < 10; i++) {
        flowEngine.tick()
      }

      // No resources should be generated
      const resources = resourceSystem.getAllResources()
      expect(resources).toHaveLength(0)
    })
  })

  describe('Output processing', () => {
    it('should collect resources from adjacent cells', () => {
      resourceSystem.unlockCharacter('1', 1)

      // Place output building
      const output: Building = {
        id: 'output-1',
        type: 'Output',
        position: { x: 2, y: 2 },
        direction: 'up',
        tier: 1,
      }

      gridSystem.placeBuilding(output)

      // Place a resource in adjacent cell
      const resource = {
        type: 'character' as const,
        value: '1',
        tier: 1,
        count: 1n,
      }

      gridSystem.setResource(3, 2, resource) // Right of output

      const initialCount = resourceSystem.getResource({ type: 'character', value: '1' })?.count || 0n

      // Process one tick
      flowEngine.tick()

      // Resource should be collected
      const newCount = resourceSystem.getResource({ type: 'character', value: '1' })?.count || 0n
      expect(newCount).toBeGreaterThan(initialCount)

      // Resource should be removed from grid
      const cellResource = gridSystem.getResource(3, 2)
      expect(cellResource).toBeNull()
    })

    it('should collect from multiple adjacent cells', () => {
      resourceSystem.unlockCharacter('1', 1)

      const output: Building = {
        id: 'output-1',
        type: 'Output',
        position: { x: 2, y: 2 },
        direction: 'up',
        tier: 1,
      }

      gridSystem.placeBuilding(output)

      // Place resources in multiple adjacent cells
      const resource = {
        type: 'character' as const,
        value: '1',
        tier: 1,
        count: 1n,
      }

      gridSystem.setResource(3, 2, { ...resource }) // Right
      gridSystem.setResource(1, 2, { ...resource }) // Left
      gridSystem.setResource(2, 1, { ...resource }) // Up

      const initialCount = resourceSystem.getResource({ type: 'character', value: '1' })?.count || 0n

      // Process one tick
      flowEngine.tick()

      // All resources should be collected
      const newCount = resourceSystem.getResource({ type: 'character', value: '1' })?.count || 0n
      expect(newCount).toBe(initialCount + 3n)
    })
  })

  describe('getAdjacentCell', () => {
    it('should return correct adjacent cell', () => {
      const cell = flowEngine.getAdjacentCell(2, 2, 'right')
      expect(cell?.x).toBe(3)
      expect(cell?.y).toBe(2)
    })

    it('should return null for out of bounds', () => {
      const cell = flowEngine.getAdjacentCell(4, 2, 'right')
      expect(cell).toBeNull()
    })

    it('should work for all directions', () => {
      const up = flowEngine.getAdjacentCell(2, 2, 'up')
      const down = flowEngine.getAdjacentCell(2, 2, 'down')
      const left = flowEngine.getAdjacentCell(2, 2, 'left')
      const right = flowEngine.getAdjacentCell(2, 2, 'right')

      expect(up?.y).toBe(1)
      expect(down?.y).toBe(3)
      expect(left?.x).toBe(1)
      expect(right?.x).toBe(3)
    })
  })

  describe('resetCounters', () => {
    it('should reset all tick counters', () => {
      resourceSystem.unlockCharacter('1', 1)

      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
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

      gridSystem.placeBuilding(generator)

      // Run some ticks
      for (let i = 0; i < 5; i++) {
        flowEngine.tick()
      }

      // Reset counters
      flowEngine.resetCounters()

      // Serialize to check counters
      const serialized = flowEngine.serialize()
      expect(serialized).toHaveLength(0)
    })
  })

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize tick counters', () => {
      resourceSystem.unlockCharacter('1', 1)

      const generator: Building = {
        id: 'gen-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
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

      gridSystem.placeBuilding(generator)

      // Run some ticks
      for (let i = 0; i < 5; i++) {
        flowEngine.tick()
      }

      const serialized = flowEngine.serialize()

      // Create new flow engine and deserialize
      const newGridSystem = new GridSystem(5)
      const newResourceSystem = new ResourceSystem()
      const newFlowEngine = new FlowEngine(newGridSystem, newResourceSystem)

      newFlowEngine.deserialize(serialized)

      // Verify counters were restored
      const newSerialized = newFlowEngine.serialize()
      expect(newSerialized).toEqual(serialized)
    })
  })
})
