import { describe, it, expect, beforeEach } from 'vitest'
import { GridSystem } from './GridSystem'
import type { Building } from '../../stores/types'

describe('GridSystem', () => {
  let gridSystem: GridSystem

  beforeEach(() => {
    gridSystem = new GridSystem(5)
  })

  describe('initialization', () => {
    it('should create a grid with correct size', () => {
      const grid = gridSystem.getGrid()
      expect(grid.width).toBe(5)
      expect(grid.height).toBe(5)
      expect(grid.cells).toHaveLength(5)
      expect(grid.cells[0]).toHaveLength(5)
    })

    it('should initialize all cells with correct coordinates', () => {
      const grid = gridSystem.getGrid()

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const cell = grid.cells[y][x]
          expect(cell.x).toBe(x)
          expect(cell.y).toBe(y)
          expect(cell.building).toBeNull()
          expect(cell.resource).toBeNull()
        }
      }
    })
  })

  describe('placeBuilding', () => {
    const mockBuilding: Building = {
      id: 'test-1',
      type: 'Generator',
      position: { x: 2, y: 2 },
      direction: 'right',
      tier: 1,
    }

    it('should place building on valid position', () => {
      const success = gridSystem.placeBuilding(mockBuilding)
      expect(success).toBe(true)

      const cell = gridSystem.getCell(2, 2)
      expect(cell.building).toBe(mockBuilding)
    })

    it('should not place building on occupied cell', () => {
      gridSystem.placeBuilding(mockBuilding)

      const anotherBuilding: Building = {
        id: 'test-2',
        type: 'Output',
        position: { x: 2, y: 2 },
        direction: 'up',
        tier: 1,
      }

      const success = gridSystem.placeBuilding(anotherBuilding)
      expect(success).toBe(false)

      const cell = gridSystem.getCell(2, 2)
      expect(cell.building).toBe(mockBuilding)
    })

    it('should not place building on invalid position', () => {
      const invalidBuilding: Building = {
        id: 'test-invalid',
        type: 'Generator',
        position: { x: 10, y: 10 },
        direction: 'right',
        tier: 1,
      }

      const success = gridSystem.placeBuilding(invalidBuilding)
      expect(success).toBe(false)
    })
  })

  describe('removeBuilding', () => {
    const mockBuilding: Building = {
      id: 'test-1',
      type: 'Generator',
      position: { x: 2, y: 2 },
      direction: 'right',
      tier: 1,
    }

    it('should remove existing building', () => {
      gridSystem.placeBuilding(mockBuilding)

      const removed = gridSystem.removeBuilding(2, 2)
      expect(removed).toBe(mockBuilding)

      const cell = gridSystem.getCell(2, 2)
      expect(cell.building).toBeNull()
    })

    it('should return null if no building at position', () => {
      const removed = gridSystem.removeBuilding(2, 2)
      expect(removed).toBeNull()
    })

    it('should return null for invalid position', () => {
      const removed = gridSystem.removeBuilding(10, 10)
      expect(removed).toBeNull()
    })
  })

  describe('getCell', () => {
    it('should return correct cell', () => {
      const cell = gridSystem.getCell(2, 3)
      expect(cell.x).toBe(2)
      expect(cell.y).toBe(3)
    })

    it('should throw error for out of bounds position', () => {
      expect(() => gridSystem.getCell(10, 10)).toThrow('Position out of bounds: (10, 10)')
    })
  })

  describe('getBuilding', () => {
    const mockBuilding: Building = {
      id: 'test-1',
      type: 'Generator',
      position: { x: 2, y: 2 },
      direction: 'right',
      tier: 1,
    }

    it('should return building at position', () => {
      gridSystem.placeBuilding(mockBuilding)
      const building = gridSystem.getBuilding(2, 2)
      expect(building).toBe(mockBuilding)
    })

    it('should return null if no building', () => {
      const building = gridSystem.getBuilding(2, 2)
      expect(building).toBeNull()
    })

    it('should return null for invalid position', () => {
      const building = gridSystem.getBuilding(10, 10)
      expect(building).toBeNull()
    })
  })

  describe('resource management', () => {
    const mockResource = {
      type: 'character' as const,
      value: '1',
      tier: 1,
      count: 1n,
    }

    it('should set resource on cell', () => {
      const success = gridSystem.setResource(2, 2, mockResource)
      expect(success).toBe(true)

      const resource = gridSystem.getResource(2, 2)
      expect(resource).toBe(mockResource)
    })

    it('should get resource from cell', () => {
      gridSystem.setResource(2, 2, mockResource)
      const resource = gridSystem.getResource(2, 2)
      expect(resource).toBe(mockResource)
    })

    it('should remove resource from cell', () => {
      gridSystem.setResource(2, 2, mockResource)
      const removed = gridSystem.removeResource(2, 2)

      expect(removed).toBe(mockResource)
      expect(gridSystem.getResource(2, 2)).toBeNull()
    })

    it('should return false when setting resource on invalid position', () => {
      const success = gridSystem.setResource(10, 10, mockResource)
      expect(success).toBe(false)
    })

    it('should return null when getting resource from invalid position', () => {
      const resource = gridSystem.getResource(10, 10)
      expect(resource).toBeNull()
    })
  })

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(gridSystem.isValidPosition(0, 0)).toBe(true)
      expect(gridSystem.isValidPosition(4, 4)).toBe(true)
      expect(gridSystem.isValidPosition(2, 3)).toBe(true)
    })

    it('should return false for invalid positions', () => {
      expect(gridSystem.isValidPosition(-1, 0)).toBe(false)
      expect(gridSystem.isValidPosition(0, -1)).toBe(false)
      expect(gridSystem.isValidPosition(5, 0)).toBe(false)
      expect(gridSystem.isValidPosition(0, 5)).toBe(false)
      expect(gridSystem.isValidPosition(10, 10)).toBe(false)
    })
  })

  describe('getAllCells', () => {
    it('should return all cells', () => {
      const cells = gridSystem.getAllCells()
      expect(cells).toHaveLength(25) // 5x5 grid
    })

    it('should return cells in correct order', () => {
      const cells = gridSystem.getAllCells()
      expect(cells[0]).toEqual({ x: 0, y: 0, building: null, resource: null })
      expect(cells[24]).toEqual({ x: 4, y: 4, building: null, resource: null })
    })
  })

  describe('getAllBuildings', () => {
    it('should return empty array initially', () => {
      const buildings = gridSystem.getAllBuildings()
      expect(buildings).toHaveLength(0)
    })

    it('should return all placed buildings', () => {
      const building1: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 0, y: 0 },
        direction: 'right',
        tier: 1,
      }

      const building2: Building = {
        id: 'test-2',
        type: 'Output',
        position: { x: 2, y: 2 },
        direction: 'up',
        tier: 1,
      }

      gridSystem.placeBuilding(building1)
      gridSystem.placeBuilding(building2)

      const buildings = gridSystem.getAllBuildings()
      expect(buildings).toHaveLength(2)
      expect(buildings).toContain(building1)
      expect(buildings).toContain(building2)
    })
  })

  describe('initializeGrid', () => {
    it('should resize grid', () => {
      gridSystem.initializeGrid(7)
      const size = gridSystem.getSize()

      expect(size.width).toBe(7)
      expect(size.height).toBe(7)
    })

    it('should preserve existing buildings when expanding', () => {
      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 2, y: 2 },
        direction: 'right',
        tier: 1,
      }

      gridSystem.placeBuilding(building)
      gridSystem.initializeGrid(7)

      const preserved = gridSystem.getBuilding(2, 2)
      expect(preserved).toBe(building)
    })

    it('should lose buildings outside bounds when shrinking', () => {
      const building: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 4, y: 4 },
        direction: 'right',
        tier: 1,
      }

      gridSystem.placeBuilding(building)
      gridSystem.initializeGrid(3)

      // Position (4, 4) is now out of bounds
      expect(gridSystem.isValidPosition(4, 4)).toBe(false)
    })
  })

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize grid with buildings', () => {
      const building1: Building = {
        id: 'test-1',
        type: 'Generator',
        position: { x: 1, y: 1 },
        direction: 'right',
        tier: 1,
        recipe: {
          id: 'recipe-1',
          inputs: [{ type: 'character', value: '1' }],
          output: { type: 'character', value: '2' },
          tier: 1,
          discovered: true,
          rarity: 0.5,
        },
      }

      const building2: Building = {
        id: 'test-2',
        type: 'Output',
        position: { x: 3, y: 3 },
        direction: 'up',
        tier: 1,
      }

      gridSystem.placeBuilding(building1)
      gridSystem.placeBuilding(building2)

      const serialized = gridSystem.serialize()

      const newGrid = new GridSystem(5)
      newGrid.deserialize(serialized)

      const buildings = newGrid.getAllBuildings()
      expect(buildings).toHaveLength(2)

      const b1 = newGrid.getBuilding(1, 1)
      expect(b1?.id).toBe('test-1')
      expect(b1?.type).toBe('Generator')
      expect(b1?.recipe).toBeDefined()

      const b2 = newGrid.getBuilding(3, 3)
      expect(b2?.id).toBe('test-2')
      expect(b2?.type).toBe('Output')
    })

    it('should preserve grid size', () => {
      gridSystem.initializeGrid(7)
      const serialized = gridSystem.serialize()

      const newGrid = new GridSystem(5)
      newGrid.deserialize(serialized)

      const size = newGrid.getSize()
      expect(size.width).toBe(7)
      expect(size.height).toBe(7)
    })
  })
})
