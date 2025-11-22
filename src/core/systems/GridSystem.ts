import type { Grid, Cell, Building, Resource } from '../../stores/types'
import { GAME_CONFIG } from '../../lib/constants'

/**
 * Grid System
 * Manages the game grid, building placement, and cell states
 */
export class GridSystem {
  private grid: Grid

  constructor(size: number = GAME_CONFIG.INITIAL_GRID_SIZE) {
    this.grid = this.createGrid(size)
  }

  /**
   * Create a new grid with the specified size
   */
  private createGrid(size: number): Grid {
    const cells: Cell[][] = []

    for (let y = 0; y < size; y++) {
      const row: Cell[] = []
      for (let x = 0; x < size; x++) {
        row.push({
          x,
          y,
          building: null,
          resource: null,
        })
      }
      cells.push(row)
    }

    return {
      width: size,
      height: size,
      cells,
    }
  }

  /**
   * Initialize or resize the grid
   */
  initializeGrid(size: number): void {
    const oldGrid = this.grid
    this.grid = this.createGrid(size)

    // Copy over existing buildings and resources if grid is being expanded
    if (oldGrid) {
      const minWidth = Math.min(oldGrid.width, size)
      const minHeight = Math.min(oldGrid.height, size)

      for (let y = 0; y < minHeight; y++) {
        for (let x = 0; x < minWidth; x++) {
          this.grid.cells[y][x] = oldGrid.cells[y][x]
        }
      }
    }
  }

  /**
   * Place a building on the grid
   */
  placeBuilding(building: Building): boolean {
    const { x, y } = building.position

    if (!this.isValidPosition(x, y)) {
      console.warn(`Invalid position: (${x}, ${y})`)
      return false
    }

    const cell = this.getCell(x, y)
    if (cell.building) {
      console.warn(`Cell already occupied: (${x}, ${y})`)
      return false
    }

    cell.building = building
    return true
  }

  /**
   * Remove a building from the grid
   */
  removeBuilding(x: number, y: number): Building | null {
    if (!this.isValidPosition(x, y)) {
      return null
    }

    const cell = this.getCell(x, y)
    const building = cell.building
    cell.building = null
    return building
  }

  /**
   * Get a cell at the specified position
   */
  getCell(x: number, y: number): Cell {
    if (!this.isValidPosition(x, y)) {
      throw new Error(`Position out of bounds: (${x}, ${y})`)
    }
    return this.grid.cells[y][x]
  }

  /**
   * Get building at position
   */
  getBuilding(x: number, y: number): Building | null {
    if (!this.isValidPosition(x, y)) {
      return null
    }
    return this.getCell(x, y).building
  }

  /**
   * Set resource on a cell
   */
  setResource(x: number, y: number, resource: Resource | null): boolean {
    if (!this.isValidPosition(x, y)) {
      return false
    }

    this.getCell(x, y).resource = resource
    return true
  }

  /**
   * Get resource at position
   */
  getResource(x: number, y: number): Resource | null {
    if (!this.isValidPosition(x, y)) {
      return null
    }
    return this.getCell(x, y).resource
  }

  /**
   * Remove resource from cell
   */
  removeResource(x: number, y: number): Resource | null {
    if (!this.isValidPosition(x, y)) {
      return null
    }

    const cell = this.getCell(x, y)
    const resource = cell.resource
    cell.resource = null
    return resource
  }

  /**
   * Check if a position is valid on the grid
   */
  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.grid.width && y >= 0 && y < this.grid.height
  }

  /**
   * Get all cells
   */
  getAllCells(): Cell[] {
    return this.grid.cells.flat()
  }

  /**
   * Get all buildings
   */
  getAllBuildings(): Building[] {
    return this.getAllCells()
      .map((cell) => cell.building)
      .filter((building): building is Building => building !== null)
  }

  /**
   * Get grid state
   */
  getGrid(): Grid {
    return this.grid
  }

  /**
   * Get grid size
   */
  getSize(): { width: number; height: number } {
    return { width: this.grid.width, height: this.grid.height }
  }

  /**
   * Serialize state for saving
   */
  serialize(): {
    width: number
    height: number
    buildings: {
      id: string
      type: string
      x: number
      y: number
      direction: string
      tier: number
      recipe?: { inputs: string[]; output: string }
    }[]
  } {
    return {
      width: this.grid.width,
      height: this.grid.height,
      buildings: this.getAllBuildings().map((building) => ({
        id: building.id,
        type: building.type,
        x: building.position.x,
        y: building.position.y,
        direction: building.direction,
        tier: building.tier,
        recipe: building.recipe
          ? {
              inputs: building.recipe.inputs.map((i) => `${i.type}:${i.value}`),
              output: `${building.recipe.output.type}:${building.recipe.output.value}`,
            }
          : undefined,
      })),
    }
  }

  /**
   * Deserialize state from save data
   */
  deserialize(data: {
    width: number
    height: number
    buildings: {
      id: string
      type: string
      x: number
      y: number
      direction: string
      tier: number
      recipe?: { inputs: string[]; output: string }
    }[]
  }): void {
    this.initializeGrid(data.width)

    for (const buildingData of data.buildings) {
      const building: Building = {
        id: buildingData.id,
        type: buildingData.type as Building['type'],
        position: { x: buildingData.x, y: buildingData.y },
        direction: buildingData.direction as Building['direction'],
        tier: buildingData.tier,
        recipe: buildingData.recipe
          ? {
              id: `${buildingData.recipe.inputs.join('+')}->${buildingData.recipe.output}`,
              inputs: buildingData.recipe.inputs.map((input) => {
                const [type, value] = input.split(':')
                return { type: type as 'character' | 'icon', value }
              }),
              output: (() => {
                const [type, value] = buildingData.recipe!.output.split(':')
                return { type: type as 'character' | 'icon', value }
              })(),
              tier: buildingData.tier,
              discovered: false,
              rarity: 0,
            }
          : undefined,
      }

      this.placeBuilding(building)
    }
  }
}
