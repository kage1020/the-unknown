// Core resource types
export type ResourceType = 'character' | 'icon'

// Character resource (base58 character)
export interface CharacterResource {
  type: 'character'
  value: string // single base58 character
  tier: number
  count: bigint
}

// Icon resource (Lucide icon)
export interface IconResource {
  type: 'icon'
  iconName: string // Lucide icon name
  tier: number
  count: bigint
}

// Union type for resources
export type Resource = CharacterResource | IconResource

// Resource identifier
export interface ResourceId {
  type: ResourceType
  value: string // character or iconName
}

// Building types
export type BuildingType = 'Generator' | 'Conveyor' | 'Merger' | 'Output'

// Direction for buildings
export type Direction = 'up' | 'down' | 'left' | 'right'

// Building on grid
export interface Building {
  id: string
  type: BuildingType
  position: { x: number; y: number }
  direction: Direction
  tier: number
  recipe?: Recipe // For generators and mergers
}

// Recipe for resource creation
export interface Recipe {
  id: string
  inputs: ResourceId[]
  output: ResourceId
  tier: number
  discovered: boolean
  rarity: number // 0-1, calculated from hash
}

// Grid cell
export interface Cell {
  x: number
  y: number
  building: Building | null
  resource: Resource | null // Resource currently on this cell
}

// Grid state
export interface Grid {
  width: number
  height: number
  cells: Cell[][]
}

// Game state
export interface GameState {
  grid: Grid
  resources: Map<string, Resource> // key: resourceId string (type:value)
  buildings: Map<string, Building> // key: building.id
  recipes: Map<string, Recipe> // key: recipe.id
  tier: number
  experience: bigint
  level: number
  tickCount: bigint
}

// Icon data
export interface IconData {
  name: string
  component: React.ComponentType<{ size?: number; color?: string }>
  tier: number
  unlocked: boolean
}
