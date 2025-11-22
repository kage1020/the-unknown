import type { Building, Resource, Cell } from '../../stores/types'
import type { GridSystem } from '../systems/GridSystem'
import type { ResourceSystem } from '../systems/ResourceSystem'
import type { CollectionSystem } from '../systems/CollectionSystem'
import { DIRECTION_VECTORS, BUILDING_TYPES } from '../../lib/constants'

/**
 * Flow Engine
 * Manages resource flow between buildings on the grid
 */
export class FlowEngine {
  private gridSystem: GridSystem
  private resourceSystem: ResourceSystem
  private collectionSystem: CollectionSystem
  private buildingTickCounters: Map<string, number> = new Map()
  private onExperienceGain?: (amount: bigint) => void

  constructor(
    gridSystem: GridSystem,
    resourceSystem: ResourceSystem,
    collectionSystem: CollectionSystem,
    onExperienceGain?: (amount: bigint) => void
  ) {
    this.gridSystem = gridSystem
    this.resourceSystem = resourceSystem
    this.collectionSystem = collectionSystem
    this.onExperienceGain = onExperienceGain
  }

  /**
   * Calculate and execute all flows for this tick
   */
  tick(): void {
    const buildings = this.gridSystem.getAllBuildings()

    // Process in order: Conveyor -> Generator -> Merger -> Output
    // This ensures resources flow properly through the system
    const conveyors = buildings.filter(b => b.type === 'Conveyor')
    const generators = buildings.filter(b => b.type === 'Generator')
    const mergers = buildings.filter(b => b.type === 'Merger')
    const outputs = buildings.filter(b => b.type === 'Output')

    // Process conveyors first to move resources
    for (const building of conveyors) {
      this.processConveyor(building)
    }

    // Then generators to produce new resources
    for (const building of generators) {
      this.processGenerator(building)
    }

    // Then mergers to combine resources
    for (const building of mergers) {
      this.processMerger(building)
    }

    // Finally outputs to collect resources
    for (const building of outputs) {
      this.processOutput(building)
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
      // Generate resource on the grid (NOT in inventory)
      const { x, y } = building.position
      const outputResource = this.createResourceFromRecipeOutput(building.recipe.output)

      // Try to place on the building's cell or adjacent cell in the building's direction
      const placed = this.placeResourceInDirection(building, outputResource)

      if (placed) {
        // Reset counter only if resource was placed successfully
        this.buildingTickCounters.set(building.id, 0)
      } else {
        // If can't place, don't reset counter (try again next tick)
        console.log(`Cannot place resource, grid is full at (${x}, ${y})`)
        this.buildingTickCounters.set(building.id, newCounter)
      }
    } else {
      // Update counter
      this.buildingTickCounters.set(building.id, newCounter)
    }
  }

  /**
   * Process Conveyor building
   * Moves resources in the direction the conveyor is facing
   */
  private processConveyor(building: Building): void {
    const counter = this.buildingTickCounters.get(building.id) || 0
    const ticksRequired = BUILDING_TYPES.Conveyor.ticksPerMove

    const newCounter = counter + 1

    if (newCounter >= ticksRequired) {
      const { x, y } = building.position
      const resource = this.gridSystem.getResource(x, y)

      if (resource) {
        // Try to move resource in the conveyor's direction
        const vector = DIRECTION_VECTORS[building.direction]
        const targetX = x + vector.dx
        const targetY = y + vector.dy

        if (this.gridSystem.isValidPosition(targetX, targetY)) {
          const targetResource = this.gridSystem.getResource(targetX, targetY)

          // Only move if target cell is empty
          if (!targetResource) {
            this.gridSystem.removeResource(x, y)
            this.gridSystem.setResource(targetX, targetY, resource)
            this.buildingTickCounters.set(building.id, 0)
          } else {
            // Target blocked, don't reset counter
            this.buildingTickCounters.set(building.id, newCounter)
          }
        } else {
          // Out of bounds, keep counter
          this.buildingTickCounters.set(building.id, newCounter)
        }
      } else {
        // No resource to move, reset counter
        this.buildingTickCounters.set(building.id, 0)
      }
    } else {
      this.buildingTickCounters.set(building.id, newCounter)
    }
  }

  /**
   * Process Merger building
   * Combines resources according to its recipe
   */
  private processMerger(building: Building): void {
    if (!building.recipe) {
      return
    }

    const counter = this.buildingTickCounters.get(building.id) || 0
    const ticksRequired = BUILDING_TYPES.Merger.ticksPerMerge

    const newCounter = counter + 1

    if (newCounter >= ticksRequired) {
      const { x, y } = building.position

      // Check if we have all required input resources in adjacent cells
      const inputs = building.recipe.inputs
      const foundResources: { x: number; y: number; resource: Resource }[] = []

      // Look for inputs in adjacent cells
      for (const dir of Object.values(DIRECTION_VECTORS)) {
        const adjX = x + dir.dx
        const adjY = y + dir.dy

        if (!this.gridSystem.isValidPosition(adjX, adjY)) {
          continue
        }

        const resource = this.gridSystem.getResource(adjX, adjY)
        if (resource) {
          // Check if this resource matches any required input
          const matchingInput = inputs.find(input => {
            const value = resource.type === 'character' ? resource.value : resource.iconName
            return input.type === resource.type && input.value === value
          })

          if (matchingInput && !foundResources.some(fr => {
            const val = fr.resource.type === 'character' ? fr.resource.value : fr.resource.iconName
            return matchingInput.type === fr.resource.type && matchingInput.value === val
          })) {
            foundResources.push({ x: adjX, y: adjY, resource })
          }
        }
      }

      // If we have all required inputs, merge them
      if (foundResources.length === inputs.length) {
        // Remove input resources
        for (const { x: rx, y: ry } of foundResources) {
          this.gridSystem.removeResource(rx, ry)
        }

        // Create output resource
        const outputResource = this.createResourceFromRecipeOutput(building.recipe.output)

        // Try to place output in the merger's direction
        const placed = this.placeResourceInDirection(building, outputResource)

        if (placed || true) {
          // Mark recipe as discovered
          const discovered = this.collectionSystem.onCraft(building.recipe.inputs)
          if (discovered && !discovered.discovered) {
            console.log(`New recipe discovered: ${discovered.id}`)
          }

          // If couldn't place but still processed, place on merger cell as fallback
          if (!placed) {
            this.gridSystem.setResource(x, y, outputResource)
          }

          this.buildingTickCounters.set(building.id, 0)
        }
      } else {
        // Don't have all inputs yet
        this.buildingTickCounters.set(building.id, newCounter)
      }
    } else {
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

        // Grant experience for collecting resources
        if (this.onExperienceGain) {
          this.onExperienceGain(1n)
        }
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

    // Only place at target position in the specified direction
    if (this.gridSystem.isValidPosition(targetX, targetY)) {
      const existingResource = this.gridSystem.getResource(targetX, targetY)
      if (!existingResource) {
        this.gridSystem.setResource(targetX, targetY, resource)
        return true
      }
    }

    // Cannot place - direction is blocked or out of bounds
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
