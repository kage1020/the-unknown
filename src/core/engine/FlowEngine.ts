import type { Building, Resource, Cell } from '../../stores/types'
import type { GridSystem } from '../systems/GridSystem'
import type { ResourceSystem } from '../systems/ResourceSystem'
import { DIRECTION_VECTORS, BUILDING_TYPES } from '../../lib/constants'

/**
 * Flow Engine
 * Manages resource flow between buildings on the grid
 * Phase 1: Only Generator support
 */
export class FlowEngine {
  private gridSystem: GridSystem
  private resourceSystem: ResourceSystem
  private buildingTickCounters: Map<string, number> = new Map()

  constructor(gridSystem: GridSystem, resourceSystem: ResourceSystem) {
    this.gridSystem = gridSystem
    this.resourceSystem = resourceSystem
  }

  /**
   * Calculate and execute all flows for this tick
   */
  tick(): void {
    const buildings = this.gridSystem.getAllBuildings()

    for (const building of buildings) {
      switch (building.type) {
        case 'Generator':
          this.processGenerator(building)
          break
        case 'Output':
          this.processOutput(building)
          break
        // Conveyor and Merger will be implemented in Phase 2
        default:
          break
      }
    }
  }

  /**
   * Process Generator building
   * Generates resources according to its recipe
   */
  private processGenerator(building: Building): void {
    if (!building.recipe) {
      return
    }

    // Get tick counter for this building
    const counter = this.buildingTickCounters.get(building.id) || 0
    const ticksRequired = BUILDING_TYPES.Generator.ticksPerGeneration

    // Increment counter first
    const newCounter = counter + 1

    if (newCounter >= ticksRequired) {
      // Generate resource
      const success = this.resourceSystem.produce(building.recipe.output, 1n)

      if (success) {
        // Place resource on the grid cell
        const { x, y } = building.position
        const outputResource = this.createResourceFromRecipeOutput(building.recipe.output)

        // Try to place on the building's cell or adjacent cell in the building's direction
        const placed = this.placeResourceInDirection(building, outputResource)

        if (!placed) {
          // If can't place, still add to inventory but don't place on grid
          console.log(`Generated resource but grid is full at (${x}, ${y})`)
        }

        // Reset counter
        this.buildingTickCounters.set(building.id, 0)
      } else {
        // Keep incrementing if production failed
        this.buildingTickCounters.set(building.id, newCounter)
      }
    } else {
      // Update counter
      this.buildingTickCounters.set(building.id, newCounter)
    }
  }

  /**
   * Process Output building
   * Collects resources from adjacent cells
   */
  private processOutput(building: Building): void {
    const { x, y } = building.position

    // Check for resources in adjacent cells
    for (const dir of Object.values(DIRECTION_VECTORS)) {
      const adjX = x + dir.dx
      const adjY = y + dir.dy

      if (!this.gridSystem.isValidPosition(adjX, adjY)) {
        continue
      }

      const resource = this.gridSystem.getResource(adjX, adjY)
      if (resource) {
        // Collect resource
        const resourceId = {
          type: resource.type,
          value: resource.type === 'character' ? resource.value : resource.iconName,
        }

        this.resourceSystem.produce(resourceId, 1n)
        this.gridSystem.removeResource(adjX, adjY)
      }
    }
  }

  /**
   * Place resource in the direction the building is facing
   */
  private placeResourceInDirection(building: Building, resource: Resource): boolean {
    const { x, y } = building.position
    const vector = DIRECTION_VECTORS[building.direction]
    const targetX = x + vector.dx
    const targetY = y + vector.dy

    // Try to place at target position
    if (this.gridSystem.isValidPosition(targetX, targetY)) {
      const existingResource = this.gridSystem.getResource(targetX, targetY)
      if (!existingResource) {
        this.gridSystem.setResource(targetX, targetY, resource)
        return true
      }
    }

    // If can't place in direction, try the building's own cell
    const existingResource = this.gridSystem.getResource(x, y)
    if (!existingResource) {
      this.gridSystem.setResource(x, y, resource)
      return true
    }

    return false
  }

  /**
   * Create a resource instance from a recipe output
   */
  private createResourceFromRecipeOutput(output: { type: 'character' | 'icon'; value: string }): Resource {
    if (output.type === 'character') {
      return {
        type: 'character',
        value: output.value,
        tier: 1, // Will be set properly from the actual resource
        count: 1n,
      }
    } else {
      return {
        type: 'icon',
        iconName: output.value,
        tier: 1, // Will be set properly from the actual resource
        count: 1n,
      }
    }
  }

  /**
   * Get adjacent cell in a specific direction
   */
  getAdjacentCell(x: number, y: number, direction: Building['direction']): Cell | null {
    const vector = DIRECTION_VECTORS[direction]
    const adjX = x + vector.dx
    const adjY = y + vector.dy

    if (!this.gridSystem.isValidPosition(adjX, adjY)) {
      return null
    }

    return this.gridSystem.getCell(adjX, adjY)
  }

  /**
   * Reset tick counters
   */
  resetCounters(): void {
    this.buildingTickCounters.clear()
  }

  /**
   * Serialize state
   */
  serialize(): { buildingId: string; counter: number }[] {
    return Array.from(this.buildingTickCounters.entries()).map(([buildingId, counter]) => ({
      buildingId,
      counter,
    }))
  }

  /**
   * Deserialize state
   */
  deserialize(data: { buildingId: string; counter: number }[]): void {
    this.buildingTickCounters.clear()
    for (const item of data) {
      this.buildingTickCounters.set(item.buildingId, item.counter)
    }
  }
}
